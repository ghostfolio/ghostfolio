import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export interface ChatMetric {
  requestId: string;
  userId: string;
  modelId?: string;
  latencyMs: number;
  totalSteps: number;
  toolsUsed: string[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  errorOccurred?: boolean;
  errorMessage?: string;
  verificationScore?: number;
  verificationResult?: Record<string, unknown>;
  timestamp: number;
}

// Anthropic pricing per million tokens (USD)
const COST_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
  'claude-opus-4-6': { input: 15, output: 75 }
};
const DEFAULT_COST = COST_PER_MTOK['claude-sonnet-4-6'];

export function estimateCostUsd(
  promptTokens: number,
  completionTokens: number,
  modelId?: string
): number {
  const rates = (modelId && COST_PER_MTOK[modelId]) || DEFAULT_COST;
  return (
    (promptTokens * rates.input + completionTokens * rates.output) / 1_000_000
  );
}

@Injectable()
export class AgentMetricsService {
  private readonly logger = new Logger(AgentMetricsService.name);
  private readonly metrics: ChatMetric[] = [];
  private readonly maxHistory = 1000;

  public constructor(private readonly prismaService: PrismaService) {}

  public record(metric: ChatMetric) {
    const sanitized = {
      ...metric,
      errorMessage: metric.errorMessage
        ? this.sanitizeError(metric.errorMessage)
        : undefined
    };

    this.metrics.push(sanitized);

    if (this.metrics.length > this.maxHistory) {
      this.metrics.splice(0, this.metrics.length - this.maxHistory);
    }

    // Persist to Postgres (fire-and-forget)
    this.persist(sanitized).catch((error) => {
      this.logger.warn(`Failed to persist metric: ${error.message}`);
    });
  }

  private sanitizeError(message: string): string {
    return message
      .replace(/postgresql?:\/\/[^\s]*/gi, '[DB_URL_REDACTED]')
      .replace(/redis:\/\/[^\s]*/gi, '[REDIS_URL_REDACTED]')
      .replace(/sk-ant-[^\s]*/gi, '[API_KEY_REDACTED]')
      .replace(/sk-proj-[^\s]*/gi, '[API_KEY_REDACTED]')
      .substring(0, 500);
  }

  private async persist(metric: ChatMetric) {
    await this.prismaService.agentChatLog.create({
      data: {
        requestId: metric.requestId,
        userId: metric.userId,
        modelId: metric.modelId ?? null,
        latencyMs: metric.latencyMs,
        totalSteps: metric.totalSteps,
        toolsUsed: metric.toolsUsed,
        promptTokens: metric.promptTokens,
        completionTokens: metric.completionTokens,
        totalTokens: metric.totalTokens,
        errorOccurred: metric.errorOccurred ?? false,
        errorMessage: metric.errorMessage ?? null,
        verificationScore: metric.verificationScore ?? null,
        verificationResult:
          (metric.verificationResult as Prisma.InputJsonValue) ?? undefined
      }
    });
  }

  public getSummary(sinceMs?: number) {
    const cutoff = sinceMs ? Date.now() - sinceMs : 0;
    const relevant = this.metrics.filter((m) => m.timestamp >= cutoff);

    if (relevant.length === 0) {
      return {
        totalChats: 0,
        avgLatencyMs: 0,
        avgSteps: 0,
        avgTokens: { prompt: 0, completion: 0, total: 0 },
        cost: { totalUsd: 0, avgPerChatUsd: 0 },
        toolUsage: {} as Record<string, number>,
        uniqueUsers: 0,
        since: cutoff ? new Date(cutoff).toISOString() : 'all_time'
      };
    }

    const toolUsage: Record<string, number> = {};
    let totalLatency = 0;
    let totalSteps = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let totalCostUsd = 0;
    const users = new Set<string>();

    for (const m of relevant) {
      totalLatency += m.latencyMs;
      totalSteps += m.totalSteps;
      promptTokens += m.promptTokens;
      completionTokens += m.completionTokens;
      totalTokens += m.totalTokens;
      totalCostUsd += estimateCostUsd(
        m.promptTokens,
        m.completionTokens,
        m.modelId
      );
      users.add(m.userId);

      for (const tool of m.toolsUsed) {
        toolUsage[tool] = (toolUsage[tool] || 0) + 1;
      }
    }

    const n = relevant.length;

    return {
      totalChats: n,
      avgLatencyMs: Math.round(totalLatency / n),
      avgSteps: +(totalSteps / n).toFixed(1),
      avgTokens: {
        prompt: Math.round(promptTokens / n),
        completion: Math.round(completionTokens / n),
        total: Math.round(totalTokens / n)
      },
      cost: {
        totalUsd: +totalCostUsd.toFixed(4),
        avgPerChatUsd: +(totalCostUsd / n).toFixed(4)
      },
      toolUsage,
      uniqueUsers: users.size,
      since: cutoff ? new Date(cutoff).toISOString() : 'all_time'
    };
  }

  public getRecent(count = 20): ChatMetric[] {
    return this.metrics.slice(-count);
  }
}
