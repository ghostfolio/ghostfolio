import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { AiService } from '@ghostfolio/api/app/endpoints/ai/ai.service';
import type { Filter } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';

import { AgentChatRequestDto } from '../contracts/agent-chat.dto';
import type {
  AgentChatResponse,
  AgentCitation,
  AgentToolEnvelope,
  AgentToolName,
  AgentToolRun
} from '../contracts/agent-chat.types';
import { InMemorySessionStore } from '../memory/in-memory-session.store';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { ConcentrationVerificationService } from '../verification/concentration-verification.service';

interface OrchestrateInput {
  filters?: Filter[];
  languageCode: string;
  userCurrency: string;
  userId: string;
}

const TOOL_SELECTION_SYSTEM_PROMPT = `You are the Ghostfolio finance AI assistant. Your task is to choose which tools to run based on the user's question.

Available tools (reply with a JSON array of the exact tool names to run, nothing else):
- allocation_breakdown: Asset and sector allocation percentages. Use when the user asks about allocation, sector, diversification, or asset mix.
- portfolio_analysis: Portfolio summary and top holdings. Use when the user asks about overview, summary, top holdings, or total value.
- risk_flags: Risk flags (drawdown, no investment, low exposure). Use when the user asks about risk, concentration, or flags.

Reply with ONLY a JSON array of tool names. Example: ["allocation_breakdown", "portfolio_analysis"]
If the question is broad or unclear, include all three tools.`;

const SYNTHESIS_SYSTEM_PROMPT = `You are a finance assistant in Ghostfolio. Synthesize the tool results into a concise, user-friendly response.
Use plain text (no markdown headings, no bullet lists).
Output exactly 5 short lines in this order:
1) Summary: <portfolio summary>
2) Top holdings: <up to 5 names/symbols with rough allocation percentages>
3) Concentration: <asset/sector concentration insight>
4) Risk: <risk interpretation>
5) Next step: <one practical action>
If verificationWarnings is non-empty, you must explicitly mention concentration risk and must NOT say there is no risk.
Do not include confidence, latency, trace ids, or duplicate warning labels.`;

const VALID_TOOL_NAMES: AgentToolName[] = [
  'allocation_breakdown',
  'portfolio_analysis',
  'risk_flags'
];

@Injectable()
export class GauntletAiOrchestratorService {
  private readonly logger = new Logger(GauntletAiOrchestratorService.name);
  private readonly retryBackoffMs = 300;

  public constructor(
    private readonly aiService: AiService,
    private readonly concentrationVerificationService: ConcentrationVerificationService,
    private readonly memoryStore: InMemorySessionStore,
    private readonly portfolioService: PortfolioService,
    private readonly toolRegistryService: ToolRegistryService
  ) {}

  public async orchestrate(
    request: AgentChatRequestDto,
    { filters, languageCode, userCurrency, userId }: OrchestrateInput
  ): Promise<AgentChatResponse> {
    const traceId = this.createTraceId();
    const startAt = Date.now();
    const toolRuns: AgentToolRun[] = [];
    const warnings: string[] = [];
    const citations: AgentCitation[] = [];

    this.memoryStore.append(request.sessionId, {
      content: request.message,
      role: 'user',
      timestamp: Date.now()
    });

    const portfolioDetails = await this.portfolioService.getDetails({
      filters,
      impersonationId: userId,
      userId,
      withSummary: true
    });

    let selectedTools: AgentToolName[];
    try {
      const toolSelectionResponse = await this.aiService.generateTextWithSystem({
        systemPrompt: TOOL_SELECTION_SYSTEM_PROMPT,
        userPrompt: request.message
      });
      selectedTools = this.parseSelectedToolsFromLlmResponse(
        toolSelectionResponse.text ?? ''
      );
    } catch (error) {
      this.logger.warn(
        `Tool selection LLM failed (${traceId}), using all tools: ${error instanceof Error ? error.message : 'Unknown'}`
      );
      selectedTools = [...VALID_TOOL_NAMES];
    }

    if (selectedTools.length === 0) {
      selectedTools = [...VALID_TOOL_NAMES];
    }

    const toolResults = new Map<AgentToolName, unknown>();

    for (const toolName of selectedTools) {
      const envelope = await this.runToolWithRetry({
        request,
        toolName,
        traceId,
        userId,
        portfolioDetails
      });

      toolRuns.push({
        durationMs: envelope.durationMs,
        status: envelope.status,
        toolName: envelope.toolName
      });

      if (envelope.status === 'success') {
        toolResults.set(toolName, envelope.output);
        citations.push({
          keys: this.extractCitationKeys(toolName, envelope.output),
          tool: toolName
        });
      } else if (envelope.error) {
        warnings.push(`${toolName} failed: ${envelope.error}`);
      }
    }

    const allocation = toolResults.get('allocation_breakdown') as
      | { assets: Array<{ key: string; percentage: number }>; sectors: Array<{ key: string; percentage: number }> }
      | undefined;

    const verification = this.concentrationVerificationService.verify({
      assets: allocation?.assets ?? [],
      sectors: allocation?.sectors ?? []
    });
    warnings.push(...verification.warnings);

    const sessionHistory = this.memoryStore.getSession(request.sessionId);
    const responsePayload = {
      message: request.message,
      sessionHistory: sessionHistory.map((item) => ({
        content: item.content,
        role: item.role
      })),
      toolResults: Object.fromEntries(toolResults),
      verificationWarnings: warnings
    };

    const hasPriorAssistantReply = sessionHistory.some(
      (item) => item.role === 'assistant'
    );
    const repeatInstruction = hasPriorAssistantReply
      ? 'If the user is asking the same or a very similar question as in sessionHistory, do not repeat the same analysis verbatim; acknowledge you already answered (e.g. "As before, …") and give a brief recap or only what changed.'
      : '';

    const synthesisPrompt = [
      SYNTHESIS_SYSTEM_PROMPT,
      repeatInstruction,
      `Preferred language: ${languageCode}.`,
      `Base currency: ${userCurrency}.`,
      JSON.stringify(responsePayload, null, 2)
    ]
      .filter(Boolean)
      .join('\n');

    let answer = 'Unable to generate analysis at this time.';
    try {
      const llmResponse = await this.aiService.generateText({ prompt: synthesisPrompt });
      answer = llmResponse.text ?? answer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown LLM failure';
      warnings.push(`LLM synthesis failed: ${errorMessage}`);
      this.logger.error(`LLM synthesis failed (${traceId}): ${errorMessage}`);
    }

    this.memoryStore.append(request.sessionId, {
      content: answer,
      role: 'assistant',
      timestamp: Date.now()
    });

    return {
      answer,
      citations,
      confidence: verification.confidence,
      latencyMs: Date.now() - startAt,
      needsHumanReview: verification.needsHumanReview,
      toolRuns,
      traceId,
      warnings
    };
  }

  private createTraceId() {
    return `gauntlet-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private parseSelectedToolsFromLlmResponse(text: string): AgentToolName[] {
    const trimmed = text.trim();
    let jsonStr = trimmed;
    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock?.[1]) {
      jsonStr = codeBlock[1].trim();
    }
    try {
      const parsed = JSON.parse(jsonStr) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      const valid = parsed.filter(
        (name): name is AgentToolName =>
          typeof name === 'string' && VALID_TOOL_NAMES.includes(name as AgentToolName)
      );
      return valid.length > 0 ? valid : [];
    } catch {
      return [];
    }
  }

  private extractCitationKeys(toolName: AgentToolName, output: unknown): string[] {
    if (toolName === 'portfolio_analysis') {
      const typed = output as
        | { topHoldings?: Array<{ symbol: string }> }
        | undefined;
      return (typed?.topHoldings ?? []).map(({ symbol }) => symbol);
    }

    if (toolName === 'allocation_breakdown') {
      const typed = output as
        | { assets?: Array<{ key: string }> }
        | undefined;
      return (typed?.assets ?? []).slice(0, 5).map(({ key }) => key);
    }

    return [];
  }

  private async runToolWithRetry({
    portfolioDetails,
    request,
    toolName,
    traceId,
    userId
  }: {
    portfolioDetails: Awaited<ReturnType<PortfolioService['getDetails']>>;
    request: AgentChatRequestDto;
    toolName: AgentToolName;
    traceId: string;
    userId: string;
  }): Promise<AgentToolEnvelope<unknown, unknown>> {
    const tool = this.toolRegistryService.getTool(toolName);

    for (let attempt = 1; attempt <= 2; attempt++) {
      const attemptStart = Date.now();

      try {
        const output = await tool.execute({
          message: request.message,
          portfolioDetails,
          sessionId: request.sessionId,
          userId
        });

        return {
          attempt,
          durationMs: Date.now() - attemptStart,
          input: { message: request.message },
          output,
          status: 'success',
          toolName,
          traceId
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown tool execution failure';

        if (attempt === 1) {
          await this.delay(this.retryBackoffMs);
          continue;
        }

        return {
          attempt,
          durationMs: Date.now() - attemptStart,
          error: errorMessage,
          input: { message: request.message },
          status: 'error',
          toolName,
          traceId
        };
      }
    }

    return {
      attempt: 2,
      durationMs: 0,
      error: 'Tool failed after retry',
      input: { message: request.message },
      status: 'error',
      toolName,
      traceId
    };
  }

  private async delay(ms: number) {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
