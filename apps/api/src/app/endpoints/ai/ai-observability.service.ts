import { Injectable, Logger } from '@nestjs/common';
import { Client, RunTree } from 'langsmith';
import { randomUUID } from 'node:crypto';

import {
  AiAgentChatResponse,
  AiAgentObservabilitySnapshot
} from './ai-agent.interfaces';

const OBSERVABILITY_LOG_LABEL = 'AiObservabilityService';
const OBSERVABILITY_TIMEOUT_IN_MS = 750;
const ENV_PLACEHOLDER_PATTERN = /^<[^>]+>$/;

interface AiAgentPolicySnapshot {
  blockReason: string;
  blockedByPolicy: boolean;
  forcedDirect: boolean;
  plannedTools: string[];
  route: string;
  toolsToExecute: string[];
}

interface AiLlmInvocationSnapshot {
  durationInMs: number;
  errorMessage?: string;
  model: string;
  prompt: string;
  provider: string;
  query?: string;
  responseText?: string;
  sessionId?: string;
  traceId: string;
  userId?: string;
}

@Injectable()
export class AiObservabilityService {
  private readonly logger = new Logger(OBSERVABILITY_LOG_LABEL);
  private hasWarnedInvalidLangSmithConfiguration = false;
  private langSmithClient?: Client;

  private get langSmithApiKey() {
    return process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY;
  }

  private get langSmithEndpoint() {
    return process.env.LANGSMITH_ENDPOINT || process.env.LANGCHAIN_ENDPOINT;
  }

  private get langSmithProjectName() {
    return (
      process.env.LANGSMITH_PROJECT ||
      process.env.LANGCHAIN_PROJECT ||
      'ghostfolio-ai-agent'
    );
  }

  private get isLangSmithTracingRequested() {
    return (
      process.env.LANGSMITH_TRACING === 'true' ||
      process.env.LANGCHAIN_TRACING_V2 === 'true'
    );
  }

  private get hasValidLangSmithApiKey() {
    const apiKey = this.langSmithApiKey?.trim();

    return Boolean(apiKey) && !ENV_PLACEHOLDER_PATTERN.test(apiKey);
  }

  private get isLangSmithEnabled() {
    if (!this.isLangSmithTracingRequested) {
      return false;
    }

    if (this.hasValidLangSmithApiKey) {
      return true;
    }

    if (!this.hasWarnedInvalidLangSmithConfiguration) {
      this.logger.warn(
        'LangSmith tracing requested but no valid API key is configured. Tracing disabled.'
      );
      this.hasWarnedInvalidLangSmithConfiguration = true;
    }

    return false;
  }

  private getLangSmithClient() {
    const apiKey = this.langSmithApiKey?.trim();

    if (!this.langSmithClient && apiKey && !ENV_PLACEHOLDER_PATTERN.test(apiKey)) {
      this.langSmithClient = new Client({
        apiKey,
        apiUrl: this.langSmithEndpoint
      });
    }

    return this.langSmithClient;
  }

  private estimateTokenCount(content: string) {
    if (!content) {
      return 0;
    }

    return Math.max(1, Math.ceil(content.length / 4));
  }

  private async runSafely(operation: () => Promise<void>) {
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      await Promise.race([
        operation().catch(() => undefined),
        new Promise<void>((resolve) => {
          timeoutId = setTimeout(resolve, OBSERVABILITY_TIMEOUT_IN_MS);
          timeoutId.unref?.();
        })
      ]);
    } catch {
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private buildChatSuccessSnapshot({
    durationInMs,
    latencyBreakdownInMs,
    policy,
    query,
    response,
    sessionId,
    traceId,
    userId
  }: {
    durationInMs: number;
    latencyBreakdownInMs: AiAgentObservabilitySnapshot['latencyBreakdownInMs'];
    policy?: AiAgentPolicySnapshot;
    query: string;
    response: AiAgentChatResponse;
    sessionId?: string;
    traceId: string;
    userId: string;
  }): AiAgentObservabilitySnapshot {
    const resolvedSessionId = response.memory.sessionId || sessionId;
    const inputTokenEstimate = this.estimateTokenCount(
      JSON.stringify({
        query,
        sessionId: resolvedSessionId,
        toolCalls: response.toolCalls.map(({ status, tool }) => {
          return { status, tool };
        }),
        policy,
        userId
      })
    );
    const outputTokenEstimate = this.estimateTokenCount(response.answer);

    return {
      latencyBreakdownInMs,
      latencyInMs: durationInMs,
      tokenEstimate: {
        input: inputTokenEstimate,
        output: outputTokenEstimate,
        total: inputTokenEstimate + outputTokenEstimate
      },
      traceId
    };
  }

  private async captureChatFailureTrace({
    durationInMs,
    errorMessage,
    query,
    sessionId,
    traceId,
    userId
  }: {
    durationInMs: number;
    errorMessage: string;
    query: string;
    sessionId?: string;
    traceId: string;
    userId: string;
  }) {
    const client = this.getLangSmithClient();

    if (!client) {
      return;
    }

    const runTree = new RunTree({
      client,
      inputs: { query, sessionId, userId },
      name: 'ghostfolio_ai_chat',
      project_name: this.langSmithProjectName,
      run_type: 'chain'
    });

    await this.runSafely(async () => runTree.postRun());
    await this.runSafely(async () => {
      runTree.end({
        outputs: {
          durationInMs,
          error: errorMessage,
          status: 'failed',
          traceId
        }
      });
    });
    await this.runSafely(async () => runTree.patchRun());
  }

  private async captureChatSuccessTrace({
    durationInMs,
    latencyBreakdownInMs,
    policy,
    query,
    response,
    tokenEstimate,
    traceId,
    userId
  }: {
    durationInMs: number;
    latencyBreakdownInMs: AiAgentObservabilitySnapshot['latencyBreakdownInMs'];
    policy?: AiAgentPolicySnapshot;
    query: string;
    response: AiAgentChatResponse;
    tokenEstimate: AiAgentObservabilitySnapshot['tokenEstimate'];
    traceId: string;
    userId: string;
  }) {
    const client = this.getLangSmithClient();

    if (!client) {
      return;
    }

    const runTree = new RunTree({
      client,
      inputs: {
        query,
        sessionId: response.memory.sessionId,
        userId
      },
      name: 'ghostfolio_ai_chat',
      project_name: this.langSmithProjectName,
      run_type: 'chain'
    });

    await this.runSafely(async () => runTree.postRun());

    for (const toolCall of response.toolCalls) {
      const childRun = runTree.createChild({
        inputs: toolCall.input,
        name: toolCall.tool,
        run_type: 'tool'
      });

      await this.runSafely(async () => childRun.postRun());
      await this.runSafely(async () =>
        childRun.end({
          outputs: {
            outputSummary: toolCall.outputSummary,
            status: toolCall.status
          }
        })
      );
      await this.runSafely(async () => childRun.patchRun());
    }

    await this.runSafely(async () =>
      runTree.end({
        outputs: {
          answer: response.answer,
          confidence: response.confidence,
          durationInMs,
          latencyBreakdownInMs,
          policy,
          tokenEstimate,
          traceId,
          verification: response.verification
        }
      })
    );
    await this.runSafely(async () => runTree.patchRun());
  }

  private async captureFeedbackTrace({
    comment,
    feedbackId,
    rating,
    sessionId,
    userId
  }: {
    comment?: string;
    feedbackId: string;
    rating: 'down' | 'up';
    sessionId: string;
    userId: string;
  }) {
    const client = this.getLangSmithClient();

    if (!client) {
      return;
    }

    const runTree = new RunTree({
      client,
      inputs: {
        comment,
        feedbackId,
        rating,
        sessionId,
        userId
      },
      name: 'ghostfolio_ai_chat_feedback',
      project_name: this.langSmithProjectName,
      run_type: 'tool'
    });

    await this.runSafely(async () => runTree.postRun());
    await this.runSafely(async () =>
      runTree.end({
        outputs: {
          accepted: true
        }
      })
    );
    await this.runSafely(async () => runTree.patchRun());
  }

  private async captureLlmInvocationTrace({
    durationInMs,
    errorMessage,
    model,
    prompt,
    provider,
    query,
    responseText,
    sessionId,
    traceId,
    userId
  }: AiLlmInvocationSnapshot) {
    const client = this.getLangSmithClient();

    if (!client) {
      return;
    }

    const runTree = new RunTree({
      client,
      inputs: {
        model,
        prompt,
        provider,
        query,
        sessionId,
        userId
      },
      name: `ghostfolio_ai_llm_${provider}`,
      project_name: this.langSmithProjectName,
      run_type: 'llm'
    });

    await this.runSafely(async () => runTree.postRun());
    await this.runSafely(async () =>
      runTree.end({
        outputs: {
          durationInMs,
          error: errorMessage,
          model,
          provider,
          responseText,
          status: errorMessage ? 'failed' : 'success',
          traceId
        }
      })
    );
    await this.runSafely(async () => runTree.patchRun());
  }

  public async captureChatFailure({
    durationInMs,
    error,
    query,
    sessionId,
    userId
  }: {
    durationInMs: number;
    error: unknown;
    query: string;
    sessionId?: string;
    userId: string;
  }) {
    const traceId = randomUUID();
    const errorMessage = error instanceof Error ? error.message : 'unknown error';

    this.logger.warn(
      JSON.stringify({
        durationInMs,
        error: errorMessage,
        event: 'ai_chat_failure',
        queryLength: query.length,
        sessionId,
        traceId,
        userId
      })
    );

    if (!this.isLangSmithEnabled) {
      return;
    }

    void this.captureChatFailureTrace({
      durationInMs,
      errorMessage,
      query,
      sessionId,
      traceId,
      userId
    }).catch(() => undefined);
  }

  public async captureChatSuccess({
    durationInMs,
    latencyBreakdownInMs,
    policy,
    query,
    response,
    sessionId,
    userId
  }: {
    durationInMs: number;
    latencyBreakdownInMs: AiAgentObservabilitySnapshot['latencyBreakdownInMs'];
    policy?: AiAgentPolicySnapshot;
    query: string;
    response: AiAgentChatResponse;
    sessionId?: string;
    userId: string;
  }): Promise<AiAgentObservabilitySnapshot> {
    const traceId = randomUUID();
    const snapshot = this.buildChatSuccessSnapshot({
      durationInMs,
      latencyBreakdownInMs,
      policy,
      query,
      response,
      sessionId,
      traceId,
      userId
    });

    this.logger.log(
      JSON.stringify({
        durationInMs,
        event: 'ai_chat_success',
        latencyBreakdownInMs,
        policy,
        queryLength: query.length,
        sessionId: response.memory.sessionId,
        tokenEstimate: snapshot.tokenEstimate,
        toolCalls: response.toolCalls.length,
        traceId,
        userId,
        verificationChecks: response.verification.length
      })
    );

    if (this.isLangSmithEnabled) {
      void this.captureChatSuccessTrace({
        durationInMs,
        latencyBreakdownInMs,
        policy,
        query,
        response,
        tokenEstimate: snapshot.tokenEstimate,
        traceId,
        userId
      }).catch(() => undefined);
    }

    return snapshot;
  }

  public async recordFeedback({
    comment,
    feedbackId,
    rating,
    sessionId,
    userId
  }: {
    comment?: string;
    feedbackId: string;
    rating: 'down' | 'up';
    sessionId: string;
    userId: string;
  }) {
    this.logger.log(
      JSON.stringify({
        commentLength: comment?.length ?? 0,
        event: 'ai_chat_feedback',
        feedbackId,
        rating,
        sessionId,
        userId
      })
    );

    if (!this.isLangSmithEnabled) {
      return;
    }

    void this.captureFeedbackTrace({
      comment,
      feedbackId,
      rating,
      sessionId,
      userId
    }).catch(() => undefined);
  }

  public async recordLlmInvocation({
    durationInMs,
    error,
    model,
    prompt,
    provider,
    query,
    responseText,
    sessionId,
    userId
  }: {
    durationInMs: number;
    error?: unknown;
    model: string;
    prompt: string;
    provider: string;
    query?: string;
    responseText?: string;
    sessionId?: string;
    userId?: string;
  }) {
    const traceId = randomUUID();
    const errorMessage = error instanceof Error ? error.message : undefined;

    this.logger.log(
      JSON.stringify({
        durationInMs,
        error: errorMessage,
        event: 'ai_llm_invocation',
        model,
        promptLength: prompt.length,
        provider,
        queryLength: query?.length ?? 0,
        responseLength: responseText?.length ?? 0,
        sessionId,
        traceId,
        userId
      })
    );

    if (!this.isLangSmithEnabled) {
      return;
    }

    void this.captureLlmInvocationTrace({
      durationInMs,
      errorMessage,
      model,
      prompt,
      provider,
      query,
      responseText,
      sessionId,
      traceId,
      userId
    }).catch(() => undefined);
  }
}
