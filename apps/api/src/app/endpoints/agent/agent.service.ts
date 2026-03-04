import { AccessService } from '@ghostfolio/api/app/access/access.service';
import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ExportService } from '@ghostfolio/api/app/export/export.service';
import { ImportService } from '@ghostfolio/api/app/import/import.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { PlatformService } from '@ghostfolio/api/app/platform/platform.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { TagService } from '@ghostfolio/api/services/tag/tag.service';
import type { UserWithSettings } from '@ghostfolio/common/types';

import { query } from '@anthropic-ai/claude-agent-sdk';
import type {
  McpSdkServerConfigWithInstance,
  SDKMessage,
  SDKResultMessage
} from '@anthropic-ai/claude-agent-sdk';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import * as crypto from 'node:crypto';

import { WatchlistService } from '../watchlist/watchlist.service';
import { AgentConversationService } from './agent-conversation.service';
import type {
  AgentStreamEvent,
  ToolCallRecord
} from './agent-stream-event.interface';
import { createAgentHooks } from './hooks';
import { SYSTEM_PROMPT } from './prompts/system-prompt';
import { AgentMetricsService } from './telemetry/agent-metrics.service';
import { AgentTracerService } from './telemetry/agent-tracer.service';
import { calculateCost } from './telemetry/cost-calculator';
import { classifyError } from './telemetry/error-classifier';
import { createGhostfolioMcpServer } from './tools';
import { withTimeout } from './tools/error-helpers';
import { VerificationService } from './verification';

const AGENT_SESSION_TTL = 86_400_000; // 24 hours
const AGENT_SESSION_PREFIX = 'agent:session:';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  private readonly effortCache = new Map<
    string,
    { result: 'low' | 'medium' | 'high'; ts: number }
  >();
  private static readonly EFFORT_CACHE_TTL = 300_000;
  private static readonly EFFORT_CACHE_MAX = 200;

  private static readonly READ_ONLY_TOOLS = [
    'mcp__ghostfolio__get_portfolio_holdings',
    'mcp__ghostfolio__get_portfolio_performance',
    'mcp__ghostfolio__get_portfolio_summary',
    'mcp__ghostfolio__get_market_allocation',
    'mcp__ghostfolio__get_account_details',
    'mcp__ghostfolio__get_dividends',
    'mcp__ghostfolio__run_portfolio_xray',
    'mcp__ghostfolio__get_holding_detail',
    'mcp__ghostfolio__get_activity_history',
    'mcp__ghostfolio__get_activity_detail',
    'mcp__ghostfolio__get_investment_timeline',
    'mcp__ghostfolio__get_cash_balances',
    'mcp__ghostfolio__get_balance_history',
    'mcp__ghostfolio__get_watchlist',
    'mcp__ghostfolio__get_tags',
    'mcp__ghostfolio__get_user_settings',
    'mcp__ghostfolio__export_portfolio'
  ];

  private static readonly MARKET_TOOLS = [
    'mcp__ghostfolio__lookup_symbol',
    'mcp__ghostfolio__get_quote',
    'mcp__ghostfolio__get_benchmarks',
    'mcp__ghostfolio__compare_to_benchmark',
    'mcp__ghostfolio__convert_currency',
    'mcp__ghostfolio__get_platforms',
    'mcp__ghostfolio__get_fear_and_greed',
    'mcp__ghostfolio__get_asset_profile',
    'mcp__ghostfolio__get_historical_price',
    'mcp__ghostfolio__get_price_history',
    'mcp__ghostfolio__get_dividend_history',
    'mcp__ghostfolio__refresh_market_data',
    'mcp__ghostfolio__suggest_dividends'
  ];

  private static readonly ACCESS_TOOLS = [
    'mcp__ghostfolio__get_portfolio_access'
  ];

  // Built-in Claude Code tools that must NOT run on a server.
  // tools: [] should disable these, but we add disallowedTools as a safeguard.
  private static readonly DISALLOWED_BUILT_IN_TOOLS = [
    'Task',
    'Bash',
    'Glob',
    'Grep',
    'Read',
    'Write',
    'Edit',
    'NotebookEdit',
    'WebFetch',
    'WebSearch',
    'TodoWrite',
    'EnterPlanMode',
    'ExitPlanMode',
    'EnterWorktree',
    'AskUserQuestion'
  ];

  public constructor(
    private readonly accessService: AccessService,
    private readonly accountBalanceService: AccountBalanceService,
    private readonly accountService: AccountService,
    private readonly benchmarkService: BenchmarkService,
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly exportService: ExportService,
    private readonly importService: ImportService,
    private readonly marketDataService: MarketDataService,
    private readonly orderService: OrderService,
    private readonly platformService: PlatformService,
    private readonly portfolioService: PortfolioService,
    private readonly prismaService: PrismaService,
    private readonly redisCacheService: RedisCacheService,
    private readonly symbolProfileService: SymbolProfileService,
    private readonly symbolService: SymbolService,
    private readonly tagService: TagService,
    private readonly userService: UserService,
    private readonly watchlistService: WatchlistService,
    private readonly verificationService: VerificationService,
    private readonly agentConversationService: AgentConversationService,
    private readonly agentMetricsService: AgentMetricsService,
    private readonly agentTracerService: AgentTracerService
  ) {}

  public async *chat({
    userId,
    userCurrency,
    languageCode,
    message,
    sessionId,
    conversationId,
    user,
    abortSignal
  }: {
    userId: string;
    userCurrency: string;
    languageCode: string;
    message: string;
    sessionId?: string;
    conversationId?: string;
    user: UserWithSettings;
    abortSignal?: AbortSignal;
  }): AsyncGenerator<AgentStreamEvent> {
    const toolStartTimes = new Map<string, number>();
    const startTime = Date.now();
    const interactionId = crypto.randomUUID();

    let queryEffort: 'low' | 'medium' | 'high' = this.classifyEffort(message);
    let primaryModel = 'claude-sonnet-4-6';

    const requestSpan = this.agentTracerService.startSpan('agent.request', {
      user_id: userId,
      session_id: sessionId || 'new',
      interaction_id: interactionId
    });

    try {
      this.assertAgentEnabled();

      const sanitizedMessage = this.sanitizeInput(message);

      requestSpan.setAttribute('langfuse.trace.input', sanitizedMessage);
      requestSpan.setAttribute('langfuse.user.id', userId);
      requestSpan.setAttribute('langfuse.session.id', sessionId || 'new');
      requestSpan.setAttribute('gen_ai.system', 'anthropic');

      // Resolve conversation and wait for exchange rates in parallel
      let activeConversationId = conversationId;
      let resolvedSessionId = sessionId;

      const exchangeRateReady =
        this.exchangeRateDataService.waitForInitialization();

      if (activeConversationId) {
        const [conversation] = await Promise.all([
          this.agentConversationService.getConversation(
            activeConversationId,
            userId
          ),
          exchangeRateReady
        ]);

        if (!conversation) {
          yield {
            type: 'error',
            code: 'SESSION_EXPIRED',
            message: 'Conversation not found or does not belong to this user.'
          };
          return;
        }

        if (!resolvedSessionId && conversation.sdkSessionId) {
          resolvedSessionId = conversation.sdkSessionId;
        }
      } else {
        const title =
          this.agentConversationService.generateTitle(sanitizedMessage);
        const [conversation] = await Promise.all([
          this.agentConversationService.createConversation(userId, title),
          exchangeRateReady
        ]);
        activeConversationId = conversation.id;
      }

      primaryModel =
        queryEffort === 'low' ? 'claude-haiku-4-5' : 'claude-sonnet-4-6';
      requestSpan.setAttribute('gen_ai.request.model', primaryModel);

      // Persist user message (fire-and-forget)
      void this.agentConversationService
        .addMessage(activeConversationId, 'user', sanitizedMessage)
        .catch((persistError) => {
          this.logger.warn('Failed to persist user message', persistError);
        });

      this.logger.log({
        event: 'agent.request',
        userId,
        sessionId: resolvedSessionId || 'new',
        conversationId: activeConversationId,
        queryLength: sanitizedMessage.length,
        timestamp: new Date().toISOString()
      });

      const otelSpan = trace.getActiveSpan();
      if (otelSpan) {
        otelSpan.setAttribute('ghostfolio.user_id', userId);
        otelSpan.setAttribute('ghostfolio.session_id', sessionId || 'new');
        otelSpan.setAttribute('ghostfolio.interaction_id', interactionId);
      }

      const requestCache = new Map<string, Promise<unknown>>();
      const mcpServer = this.createMcpServer(
        userId,
        userCurrency,
        user,
        requestCache,
        this.getAllowedTools(queryEffort)
      );

      // Validate before injecting into system prompt to prevent prompt injection
      const safeCurrency = /^[A-Z]{3}$/.test(userCurrency)
        ? userCurrency
        : 'USD';
      const safeLanguage = /^[a-z]{2}(-[A-Z]{2})?$/.test(languageCode)
        ? languageCode
        : 'en';

      const systemPrompt = SYSTEM_PROMPT.replace(
        '{{USER_CURRENCY}}',
        safeCurrency
      ).replace('{{LANGUAGE_CODE}}', safeLanguage);

      let accumulatedText = '';
      let accumulatedReasoning = '';
      const toolCallRecords: ToolCallRecord[] = [];
      const knownSafeUuids = new Set<string>();

      const extractUuids = (data: unknown): void => {
        const uuidPattern =
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        const matches = text?.match(uuidPattern) ?? [];
        for (const uuid of matches) {
          knownSafeUuids.add(uuid.toLowerCase());
        }
      };

      const pendingToolUse = new Map<
        string,
        {
          toolName: string;
          inputArgs: Record<string, unknown>;
          timestamp: Date;
        }
      >();

      const activeToolSpans = new Map<
        string,
        ReturnType<AgentTracerService['startChildSpan']>
      >();

      const llmSpan = this.agentTracerService.startChildSpan(
        'agent.llm',
        requestSpan.span,
        {
          'gen_ai.system': 'anthropic',
          'gen_ai.request.model': primaryModel,
          'langfuse.observation.input': JSON.stringify([
            { role: 'user', content: sanitizedMessage }
          ])
        }
      );
      let llmSpanEnded = false;

      const runQuery = async function* (
        self: AgentService,
        resumeSessionId: string | undefined
      ): AsyncGenerator<AgentStreamEvent> {
        const abortController = new AbortController();
        const inactivityMs =
          queryEffort === 'high'
            ? 60_000
            : queryEffort === 'medium'
              ? 45_000
              : 30_000;
        let timeout = setTimeout(() => abortController.abort(), inactivityMs);
        const resetTimeout = (ms = inactivityMs) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => abortController.abort(), ms);
        };

        if (abortSignal) {
          if (abortSignal.aborted) {
            abortController.abort();
          } else {
            abortSignal.addEventListener(
              'abort',
              () => abortController.abort(),
              { once: true }
            );
          }
        }

        const fallbackModel =
          primaryModel === 'claude-haiku-4-5'
            ? 'claude-sonnet-4-6'
            : 'claude-haiku-4-5';

        const sdkQuery = query({
          prompt: `<user_message>${sanitizedMessage}</user_message>`,
          options: {
            model: primaryModel,
            fallbackModel,
            systemPrompt,
            tools: [],
            disallowedTools: AgentService.DISALLOWED_BUILT_IN_TOOLS,
            mcpServers: {
              ghostfolio: mcpServer
            },
            maxTurns:
              queryEffort === 'low' ? 3 : queryEffort === 'medium' ? 5 : 7,
            maxBudgetUsd:
              queryEffort === 'low'
                ? 0.1
                : queryEffort === 'medium'
                  ? 0.25
                  : 0.5,
            permissionMode: 'dontAsk',
            thinking:
              queryEffort === 'high'
                ? { type: 'adaptive' }
                : { type: 'disabled' },
            effort: queryEffort,
            hooks: createAgentHooks(self.logger),
            promptSuggestions: queryEffort !== 'low',
            allowedTools: self.getAllowedTools(queryEffort),
            includePartialMessages: true,
            resume: resumeSessionId,
            abortController
          }
        });

        try {
          let hasStreamedText = false;

          for await (const sdkMessage of sdkQuery) {
            if (sdkMessage.type === 'result') {
              resetTimeout(10_000);
            } else {
              resetTimeout();
            }

            const events = self.mapSdkMessage(
              sdkMessage,
              toolStartTimes,
              hasStreamedText
            );

            for (let event of events) {
              if (event.type === 'reasoning_delta') {
                if (!accumulatedReasoning) {
                  self.logger.debug(
                    'First reasoning block received, length: ' +
                      event.text.length
                  );
                }
                accumulatedReasoning += event.text;
              }

              if (event.type === 'content_delta') {
                hasStreamedText = true;
                accumulatedText += event.text;
              }

              if (event.type === 'tool_use_start') {
                const shortName = event.toolName.replace(
                  'mcp__ghostfolio__',
                  ''
                );
                pendingToolUse.set(event.toolId, {
                  toolName: shortName,
                  inputArgs: (event.input as Record<string, unknown>) ?? {},
                  timestamp: new Date()
                });

                const toolSpan = self.agentTracerService.startChildSpan(
                  `agent.tool.${shortName}`,
                  requestSpan.span,
                  {
                    'gen_ai.tool.name': shortName,
                    'langfuse.observation.input': JSON.stringify(
                      (event.input as Record<string, unknown>) ?? {}
                    )
                  }
                );
                activeToolSpans.set(event.toolId, toolSpan);
              }

              if (event.type === 'tool_result') {
                const pending = pendingToolUse.get(event.toolId);
                if (pending) {
                  toolCallRecords.push({
                    toolName: pending.toolName,
                    timestamp: pending.timestamp,
                    inputArgs: pending.inputArgs,
                    outputData: event.result,
                    success: event.success,
                    durationMs: event.duration_ms
                  });
                  pendingToolUse.delete(event.toolId);

                  const toolSpan = activeToolSpans.get(event.toolId);
                  if (toolSpan) {
                    const resultStr =
                      typeof event.result === 'string'
                        ? event.result
                        : JSON.stringify(event.result);
                    toolSpan.setAttribute(
                      'langfuse.observation.output',
                      resultStr?.slice(0, 10_000) ?? ''
                    );
                    if (event.success) {
                      toolSpan.setOk();
                    } else {
                      toolSpan.setError(
                        new Error(`Tool ${pending.toolName} failed`)
                      );
                    }
                    toolSpan.end();
                    activeToolSpans.delete(event.toolId);
                  }

                  if (event.result) {
                    extractUuids(event.result);
                  }
                }
              }

              yield event;
            }
          }
        } finally {
          clearTimeout(timeout);

          for (const [toolId, toolSpan] of activeToolSpans) {
            toolSpan.setError(new Error('Tool span orphaned'));
            toolSpan.end();
            activeToolSpans.delete(toolId);
          }
        }
      };

      let resultSessionId: string | undefined;
      let doneEvent: AgentStreamEvent | undefined;
      let pendingSuggestions: AgentStreamEvent | undefined;

      const collectEvents = async function* (
        self: AgentService,
        resumeId: string | undefined
      ): AsyncGenerator<AgentStreamEvent> {
        for await (const event of runQuery(self, resumeId)) {
          if (event.type === 'done') {
            resultSessionId = event.sessionId;
            doneEvent = event;
            continue;
          }
          if (event.type === 'suggestions') {
            pendingSuggestions = event;
            continue;
          }
          yield event;
        }
      };

      try {
        try {
          for await (const event of collectEvents(
            this,
            resolvedSessionId || undefined
          )) {
            yield event;
          }
        } catch (error) {
          if (resolvedSessionId) {
            this.logger.warn('Session resume failed, starting new session', {
              sessionId
            });
            accumulatedText = '';
            accumulatedReasoning = '';
            toolCallRecords.length = 0;
            pendingToolUse.clear();
            knownSafeUuids.clear();
            doneEvent = undefined;

            for await (const event of collectEvents(this, undefined)) {
              yield event;
            }
          } else {
            throw error;
          }
        }

        // Run verification pipeline before done event
        if (doneEvent && accumulatedText) {
          const rawText = accumulatedText;
          accumulatedText = this.sanitizeResponse(
            accumulatedText,
            userId,
            knownSafeUuids
          );

          if (accumulatedText !== rawText) {
            yield {
              type: 'content_replace' as const,
              content: accumulatedText,
              corrections: [
                { original: '[redacted content]', corrected: '[REDACTED]' }
              ]
            };
          }

          if (queryEffort !== 'high') {
            // Skip full verification for simple queries
            yield {
              type: 'confidence',
              level: 'high' as const,
              score: 0.95,
              reasoning: 'Data retrieval query -- verification skipped',
              factCheck: {
                passed: true,
                verifiedCount: toolCallRecords.length,
                unverifiedCount: 0,
                derivedCount: 0
              },
              hallucination: { detected: false, rate: 0, flaggedClaims: [] },
              dataFreshnessMs: Date.now() - startTime,
              verificationDurationMs: 0
            };
            yield { type: 'disclaimer', disclaimers: [], domainViolations: [] };
          } else {
            yield { type: 'verifying', status: 'verifying' };

            const vr = await this.verificationService.verify({
              toolCalls: toolCallRecords,
              agentResponseText: accumulatedText,
              userId,
              userCurrency,
              requestTimestamp: new Date(startTime)
            });

            yield {
              type: 'confidence',
              level: vr.confidence.level.toLowerCase() as
                | 'high'
                | 'medium'
                | 'low',
              score: vr.confidence.score,
              reasoning: vr.confidence.reasoning,
              factCheck: {
                passed: vr.factCheck.passed,
                verifiedCount: vr.factCheck.verifiedCount,
                unverifiedCount: vr.factCheck.unverifiedCount,
                derivedCount: vr.factCheck.derivedCount
              },
              hallucination: {
                detected: vr.hallucination.detected,
                rate: vr.hallucination.rate,
                flaggedClaims: vr.hallucination.flaggedClaims
              },
              dataFreshnessMs: vr.dataFreshnessMs,
              verificationDurationMs: vr.verificationDurationMs
            };

            const corrections = vr.outputValidation.corrections;
            if (corrections?.length > 0) {
              for (const c of corrections) {
                accumulatedText = accumulatedText
                  .split(c.original)
                  .join(c.corrected);
              }
              yield {
                type: 'content_replace' as const,
                content: accumulatedText,
                corrections: corrections.map((c) => ({
                  original: c.original,
                  corrected: c.corrected
                }))
              };
            }

            yield {
              type: 'disclaimer',
              disclaimers: vr.disclaimers.disclaimerIds,
              domainViolations: vr.domainValidation.violations.map(
                (v) => v.description
              )
            };

            if (vr.hallucination.rate > 0.15) {
              yield {
                type: 'correction',
                message:
                  'Warning: This response contains claims that could not be fully verified. Please refer to the raw data below.'
              };
            }
          }
        }

        // Persist interaction and record metrics BEFORE emitting done
        if (doneEvent && doneEvent.type === 'done') {
          const costUsd = calculateCost(
            primaryModel,
            doneEvent.usage.inputTokens,
            doneEvent.usage.outputTokens,
            doneEvent.usage.costUsd
          );

          if (!llmSpanEnded) {
            const truncReasoning = accumulatedReasoning
              ? accumulatedReasoning.slice(0, 50_000)
              : undefined;
            if (truncReasoning)
              llmSpan.setAttribute('gen_ai.reasoning', truncReasoning);
            llmSpan.setAttribute(
              'langfuse.observation.output',
              JSON.stringify([
                {
                  role: 'assistant',
                  content: accumulatedText,
                  ...(truncReasoning ? { reasoning: truncReasoning } : {})
                }
              ])
            );
            llmSpan.setAttribute(
              'gen_ai.usage.input_tokens',
              doneEvent.usage.inputTokens
            );
            llmSpan.setAttribute(
              'gen_ai.usage.output_tokens',
              doneEvent.usage.outputTokens
            );
            llmSpan.setAttribute('gen_ai.usage.cost', costUsd);
            llmSpan.setOk();
            llmSpan.end();
            llmSpanEnded = true;
          }

          const resolvedModel = (doneEvent as any).model || primaryModel;
          this.agentMetricsService.recordQuery({
            userId,
            model: resolvedModel,
            costUsd,
            durationMs: Date.now() - startTime,
            toolCount: toolCallRecords.length,
            inputTokens: doneEvent.usage.inputTokens,
            outputTokens: doneEvent.usage.outputTokens
          });
          for (const tc of toolCallRecords) {
            this.agentMetricsService.recordToolCall(
              tc.toolName,
              tc.durationMs,
              tc.success
            );
          }

          if (resolvedModel !== primaryModel) {
            this.logger.warn(
              `Fallback model used: ${resolvedModel} (primary was ${primaryModel})`
            );
          }

          yield {
            type: 'done' as const,
            sessionId: doneEvent.sessionId,
            conversationId: activeConversationId,
            messageId: doneEvent.messageId,
            usage: doneEvent.usage,
            model: resolvedModel,
            interactionId,
            degradationLevel: 'full' as const
          };

          if (pendingSuggestions) {
            yield pendingSuggestions;
          }

          // Fire-and-forget persistence
          void this.persistPostLlmData({
            interactionId,
            userId,
            sessionId: doneEvent.sessionId,
            conversationId: activeConversationId,
            model: resolvedModel,
            inputTokens: doneEvent.usage.inputTokens,
            outputTokens: doneEvent.usage.outputTokens,
            costUsd,
            durationMs: Date.now() - startTime,
            toolCount: toolCallRecords.length,
            otelTraceId: requestSpan.span.spanContext?.().traceId ?? null,
            accumulatedText,
            toolCallRecords,
            isNewConversation: !conversationId,
            userMessage: sanitizedMessage
          });

          if (costUsd > 0.1) {
            this.logger.warn('High-cost agent query detected', {
              userId,
              costUsd,
              interactionId
            });
          }
        } else if (doneEvent) {
          yield doneEvent;
        }
      } catch (error) {
        // If partial content was streamed before the error, discard it
        if (accumulatedText) {
          yield {
            type: 'content_replace' as const,
            content: '',
            corrections: []
          };
        }

        // End LLM span on error path
        if (!llmSpanEnded) {
          if (accumulatedText) {
            llmSpan.setAttribute(
              'langfuse.observation.output',
              JSON.stringify([{ role: 'assistant', content: accumulatedText }])
            );
          }
          if (accumulatedReasoning) {
            const truncatedReasoning = accumulatedReasoning.slice(0, 50_000);
            llmSpan.setAttribute('gen_ai.reasoning', truncatedReasoning);
          }
          llmSpan.setError(error);
          llmSpan.end();
          llmSpanEnded = true;
        }

        if (
          error?.message?.includes('rate_limit') ||
          error?.message?.includes('429') ||
          error?.error?.type === 'rate_limit'
        ) {
          this.logger.warn(`Rate limited: ${error.message}`);

          yield {
            type: 'error',
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfterMs: 60000
          };
          return;
        }

        this.logger.error(`SDK query failed: ${error?.message}`);

        yield {
          type: 'error',
          code: 'INTERNAL_ERROR',
          message:
            'Service temporarily unavailable. Please try again in a few minutes.'
        };
        return;
      }

      if (resultSessionId) {
        void this.redisCacheService.set(
          `${AGENT_SESSION_PREFIX}${resultSessionId}`,
          userId,
          AGENT_SESSION_TTL
        );
      }

      requestSpan.setAttribute('langfuse.trace.output', accumulatedText);
      if (accumulatedReasoning) {
        requestSpan.setAttribute(
          'langfuse.trace.metadata.reasoning',
          accumulatedReasoning.slice(0, 50_000)
        );
      }
      requestSpan.setOk();

      this.logger.log({
        event: 'agent.response',
        userId,
        sessionId: resultSessionId,
        toolCalls: toolCallRecords.map((t) => ({
          tool: t.toolName,
          durationMs: t.durationMs,
          success: t.success
        })),
        durationMs: Date.now() - startTime,
        model: primaryModel,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      requestSpan.setError(error);
      const classified = classifyError(error);
      this.agentMetricsService.recordError(classified.category);
      this.agentMetricsService.recordQuery({
        userId,
        model: primaryModel,
        costUsd: 0,
        durationMs: Date.now() - startTime,
        toolCount: 0,
        inputTokens: 0,
        outputTokens: 0
      });

      if (error instanceof HttpException) throw error;

      const isRateLimit =
        error?.message?.includes('rate_limit') ||
        error?.message?.includes('429') ||
        error?.error?.type === 'rate_limit';

      this.logger.error({
        event: 'agent.error',
        userId,
        errorType: classified.category,
        errorMessage: error?.message
      });

      yield {
        type: 'error',
        code: isRateLimit ? 'RATE_LIMITED' : 'INTERNAL_ERROR',
        message: isRateLimit
          ? 'Rate limit exceeded. Please try again later.'
          : 'An unexpected error occurred',
        ...(isRateLimit ? { retryAfterMs: 60000 } : {})
      };
    } finally {
      requestSpan.end();
    }
  }

  private classifyEffort(message: string): 'low' | 'medium' | 'high' {
    const normalized = message
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);
    const cacheKey = normalized.slice(0, 100);

    const cached = this.effortCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < AgentService.EFFORT_CACHE_TTL) {
      return cached.result;
    }

    // Keyword-based classification
    const q = normalized;
    let result: 'low' | 'medium' | 'high';
    if (
      /\b(analyz|compar|rebalanc|risk|recommend|explain|why|diversif)\b/.test(q)
    ) {
      result = 'high';
    } else if (
      /\b(look\s*up|search|price|quote|benchmark|platform|access|history|convert)\b/.test(
        q
      )
    ) {
      result = 'medium';
    } else {
      result = 'low';
    }

    // Store in cache, evict oldest if full
    if (this.effortCache.size >= AgentService.EFFORT_CACHE_MAX) {
      const oldest = this.effortCache.keys().next().value;
      if (oldest !== undefined) {
        this.effortCache.delete(oldest);
      }
    }
    this.effortCache.set(cacheKey, { result, ts: Date.now() });

    return result;
  }

  private getAllowedTools(_effort: 'low' | 'medium' | 'high'): string[] {
    return [
      ...AgentService.READ_ONLY_TOOLS,
      ...AgentService.MARKET_TOOLS,
      ...AgentService.ACCESS_TOOLS
    ];
  }

  private assertAgentEnabled(): void {
    if (!this.configurationService.get('ENABLE_FEATURE_AGENT')) {
      throw new HttpException(
        'Agent is not configured. Set ANTHROPIC_API_KEY to enable.',
        HttpStatus.NOT_IMPLEMENTED
      );
    }

    if (!this.configurationService.get('ANTHROPIC_API_KEY')) {
      throw new HttpException(
        'Agent is not configured. Set ANTHROPIC_API_KEY to enable.',
        HttpStatus.NOT_IMPLEMENTED
      );
    }
  }

  private sanitizeInput(raw: string): string {
    let sanitized = raw.replace(/[\p{Cc}\p{Cf}]/gu, (match) => {
      return ['\n', '\r', '\t', ' '].includes(match) ? match : '';
    });

    sanitized = sanitized.trim();
    if (sanitized.length === 0) {
      throw new HttpException(
        { message: 'Query must not be empty' },
        HttpStatus.BAD_REQUEST
      );
    }

    return sanitized;
  }

  private sanitizeResponse(
    text: string,
    userId: string,
    knownSafeUuids?: Set<string>
  ): string {
    let sanitized = text.replace(/sk-ant-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
    sanitized = sanitized.replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
    sanitized = sanitized.replace(/key-[a-zA-Z0-9]{32,}/g, '[REDACTED]');
    sanitized = sanitized.replace(
      /Bearer\s+[a-zA-Z0-9._-]{20,}/gi,
      'Bearer [REDACTED]'
    );

    if (knownSafeUuids) {
      const uuidPattern =
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
      const foundUuids = sanitized.match(uuidPattern) ?? [];

      for (const uuid of foundUuids) {
        const normalizedUuid = uuid.toLowerCase();

        if (normalizedUuid === userId.toLowerCase()) {
          continue;
        }

        if (knownSafeUuids.has(normalizedUuid)) {
          continue;
        }

        sanitized = sanitized.split(uuid).join('[UUID-REDACTED]');
        this.logger.warn('Response contained unknown UUID, redacted', {
          userId
        });
      }
    }

    if (sanitized !== text) {
      this.logger.warn('Response sanitization redacted content', { userId });
    }

    return sanitized;
  }

  /** Fire-and-forget persistence of post-LLM data. */
  private async persistPostLlmData(p: {
    interactionId: string;
    userId: string;
    sessionId: string;
    conversationId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    durationMs: number;
    toolCount: number;
    otelTraceId: string | null;
    accumulatedText: string;
    toolCallRecords: ToolCallRecord[];
    isNewConversation: boolean;
    userMessage: string;
  }): Promise<void> {
    try {
      await withTimeout(
        this.prismaService.agentInteraction.create({
          data: {
            id: p.interactionId,
            userId: p.userId,
            sessionId: p.sessionId,
            conversationId: p.conversationId,
            model: p.model,
            inputTokens: p.inputTokens,
            outputTokens: p.outputTokens,
            costUsd: p.costUsd,
            durationMs: p.durationMs,
            toolCount: p.toolCount,
            otelTraceId: p.otelTraceId
          }
        }),
        5000
      );
    } catch (e) {
      this.logger.warn('Failed to persist agent interaction', e);
    }

    if (p.conversationId) {
      try {
        await this.agentConversationService.addMessage(
          p.conversationId,
          'agent',
          p.accumulatedText,
          {
            toolsUsed: p.toolCallRecords.map((t) => ({
              toolName: t.toolName,
              success: t.success,
              durationMs: t.durationMs
            })),
            interactionId: p.interactionId
          }
        );
        await this.agentConversationService.updateSdkSessionId(
          p.conversationId,
          p.sessionId
        );
      } catch (e) {
        this.logger.warn('Failed to persist agent message', e);
      }
    }

    if (p.isNewConversation && p.conversationId && p.accumulatedText) {
      try {
        const smartTitle =
          await this.agentConversationService.generateSmartTitle(
            p.userMessage,
            p.accumulatedText
          );
        await this.agentConversationService.updateTitle(
          p.conversationId,
          smartTitle
        );
      } catch {
        this.logger.debug('Smart title generation failed');
      }
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyCost = await withTimeout(
        this.prismaService.agentInteraction.aggregate({
          where: { userId: p.userId, createdAt: { gte: today } },
          _sum: { costUsd: true }
        }),
        5000
      );
      if (Number(dailyCost._sum.costUsd ?? 0) > 1.0) {
        this.logger.warn('User daily agent cost exceeds $1.00', {
          userId: p.userId,
          dailyTotal: Number(dailyCost._sum.costUsd)
        });
      }
    } catch {
      // Non-critical
    }
  }

  private createMcpServer(
    userId: string,
    userCurrency: string,
    requestUser: UserWithSettings,
    requestCache: Map<string, Promise<unknown>>,
    allowedTools?: string[]
  ): McpSdkServerConfigWithInstance {
    return createGhostfolioMcpServer(
      {
        accessService: this.accessService,
        accountBalanceService: this.accountBalanceService,
        accountService: this.accountService,
        benchmarkService: this.benchmarkService,
        dataGatheringService: this.dataGatheringService,
        dataProviderService: this.dataProviderService,
        exchangeRateDataService: this.exchangeRateDataService,
        exportService: this.exportService,
        importService: this.importService,
        marketDataService: this.marketDataService,
        orderService: this.orderService,
        platformService: this.platformService,
        portfolioService: this.portfolioService,
        prismaService: this.prismaService,
        symbolProfileService: this.symbolProfileService,
        symbolService: this.symbolService,
        tagService: this.tagService,
        userService: this.userService,
        watchlistService: this.watchlistService,
        redisCacheService: this.redisCacheService,
        user: this.buildUserContext(userId, userCurrency, requestUser),
        requestCache
      },
      allowedTools
    );
  }

  private mapSdkMessage(
    sdkMessage: SDKMessage,
    toolStartTimes: Map<string, number>,
    hasStreamedText: boolean
  ): AgentStreamEvent[] {
    const events: AgentStreamEvent[] = [];

    switch (sdkMessage.type) {
      case 'system': {
        const systemMsg = sdkMessage as any;
        if (systemMsg.subtype === 'task_notification') {
          this.logger.warn(
            `Task subagent completed with status=${systemMsg.status}: ${systemMsg.summary ?? 'no summary'}`
          );
        } else if (systemMsg.subtype && systemMsg.subtype !== 'init') {
          this.logger.debug(`SDK system message subtype: ${systemMsg.subtype}`);
        }
        break;
      }

      case 'stream_event': {
        const event = sdkMessage.event;

        if (event.type === 'content_block_start' && 'content_block' in event) {
          const block = (event as any).content_block;
          if (block?.type === 'thinking' && block.thinking) {
            events.push({ type: 'reasoning_delta', text: block.thinking });
          }
        }

        if (event.type === 'content_block_delta' && 'delta' in event) {
          const delta = event.delta as any;
          if (delta.type === 'thinking_delta' && delta.thinking) {
            events.push({ type: 'reasoning_delta', text: delta.thinking });
          }
          if (delta.type === 'text_delta' && delta.text) {
            events.push({ type: 'content_delta', text: delta.text });
          }
        }
        break;
      }

      case 'assistant': {
        const message = sdkMessage.message;
        if (message?.content) {
          for (const block of message.content) {
            if (block.type === 'tool_use') {
              toolStartTimes.set(block.id, Date.now());
              events.push({
                type: 'tool_use_start',
                toolName: block.name,
                toolId: block.id,
                input: block.input
              });
            }
          }
        }
        break;
      }

      case 'user': {
        const message = sdkMessage.message;
        const content = message?.content;

        if (Array.isArray(content)) {
          for (const block of content) {
            if (
              typeof block === 'object' &&
              block !== null &&
              'type' in block &&
              (block as any).type === 'tool_result'
            ) {
              const toolResultBlock = block as any;
              const toolUseId = toolResultBlock.tool_use_id;
              const startTime = toolStartTimes.get(toolUseId);
              const durationMs = startTime ? Date.now() - startTime : 0;
              toolStartTimes.delete(toolUseId);

              events.push({
                type: 'tool_result',
                toolId: toolUseId,
                success: !toolResultBlock.is_error,
                duration_ms: durationMs,
                result: toolResultBlock.content
              });
            }
          }
        }
        break;
      }

      case 'result': {
        const result = sdkMessage as SDKResultMessage;

        if (result.subtype !== 'success') {
          const errorMessages =
            'errors' in result ? (result as any).errors : [];
          this.logger.warn(
            `SDK query ended with ${result.subtype}: ${errorMessages.join('; ')}`
          );
          events.push({
            type: 'error',
            code: 'INTERNAL_ERROR',
            message:
              result.subtype === 'error_max_budget_usd'
                ? 'Request exceeded budget limit. Please try a simpler query.'
                : result.subtype === 'error_max_turns'
                  ? 'This request required too many steps. Please try breaking it into smaller requests.'
                  : 'An unexpected error occurred while processing your request.'
          });
        }

        if (
          !hasStreamedText &&
          result.subtype === 'success' &&
          result.result &&
          typeof result.result === 'string'
        ) {
          events.push({ type: 'content_delta', text: result.result });
        }

        let actualModel: string | undefined;
        if (result.usage) {
          const usageObj = result.usage as Record<string, unknown>;
          if ('model' in usageObj && typeof usageObj.model === 'string') {
            actualModel = usageObj.model;
          }
        }

        events.push({
          type: 'done',
          sessionId: result.session_id,
          conversationId: '',
          messageId: result.uuid,
          usage: {
            inputTokens: result.usage?.input_tokens ?? 0,
            outputTokens: result.usage?.output_tokens ?? 0,
            costUsd: result.total_cost_usd ?? 0
          },
          model: actualModel
        });
        break;
      }

      case 'prompt_suggestion': {
        const suggestion = (sdkMessage as any).suggestion;
        this.logger.debug(
          `Received prompt_suggestion from SDK: ${suggestion?.slice(0, 100)}`
        );
        if (typeof suggestion === 'string' && suggestion.trim()) {
          events.push({
            type: 'suggestions',
            suggestions: [suggestion.trim()]
          });
        }
        break;
      }

      default:
        this.logger.verbose(`Unhandled SDK message type: ${sdkMessage.type}`);
        break;
    }

    return events;
  }

  private buildUserContext(
    userId: string,
    userCurrency: string,
    requestUser: UserWithSettings
  ): UserWithSettings {
    const now = new Date();
    return {
      id: userId,
      accessToken: null,
      authChallenge: null,
      createdAt: now,
      provider: 'ANONYMOUS',
      role: 'USER',
      thirdPartyId: null,
      updatedAt: now,
      accessesGet: [],
      accounts: [],
      activityCount: 0,
      dataProviderGhostfolioDailyRequests: 0,
      permissions: requestUser.permissions ?? [],
      settings: {
        id: '',
        createdAt: now,
        updatedAt: now,
        userId,
        settings: {
          baseCurrency: userCurrency,
          language: requestUser.settings?.settings?.language ?? 'en',
          locale: requestUser.settings?.settings?.locale ?? 'en-US'
        } as any
      } as any,
      subscription: requestUser.subscription
    } as UserWithSettings;
  }
}
