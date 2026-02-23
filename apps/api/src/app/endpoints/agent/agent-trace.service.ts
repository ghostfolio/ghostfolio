import { Injectable } from '@nestjs/common';

export interface ToolTrace {
  name: string;
  args: Record<string, unknown>;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface AgentTrace {
  id: string;
  timestamp: string;
  userId: string;
  input: string;
  output: string;
  model: string;
  toolCalls: ToolTrace[];
  verification: { passed: boolean; type: string } | null;
  latency: {
    totalMs: number;
    llmMs: number;
    toolsMs: number;
  };
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  estimatedCostUsd: number;
  success: boolean;
  error?: string;
}

export interface TraceStats {
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  avgTokensPerRequest: number;
  totalTokens: number;
  estimatedTotalCostUsd: number;
  toolUsageCount: Record<string, number>;
  verificationPassRate: number;
}

@Injectable()
export class AgentTraceService {
  private traces: AgentTrace[] = [];
  private readonly maxTraces = 500;

  public addTrace(trace: AgentTrace): void {
    this.traces.push(trace);
    if (this.traces.length > this.maxTraces) {
      this.traces = this.traces.slice(-this.maxTraces);
    }
  }

  public getTraces(limit = 50, offset = 0): AgentTrace[] {
    const sorted = [...this.traces].reverse();
    return sorted.slice(offset, offset + limit);
  }

  public getTraceById(id: string): AgentTrace | undefined {
    return this.traces.find((t) => t.id === id);
  }

  public getStats(): TraceStats {
    const total = this.traces.length;
    if (total === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgLatencyMs: 0,
        avgTokensPerRequest: 0,
        totalTokens: 0,
        estimatedTotalCostUsd: 0,
        toolUsageCount: {},
        verificationPassRate: 0
      };
    }

    const successful = this.traces.filter((t) => t.success).length;
    const totalLatency = this.traces.reduce((s, t) => s + t.latency.totalMs, 0);
    const totalTokens = this.traces.reduce((s, t) => s + t.tokens.total, 0);
    const totalCost = this.traces.reduce((s, t) => s + t.estimatedCostUsd, 0);

    const toolUsageCount: Record<string, number> = {};
    for (const trace of this.traces) {
      for (const tc of trace.toolCalls) {
        toolUsageCount[tc.name] = (toolUsageCount[tc.name] || 0) + 1;
      }
    }

    const withVerification = this.traces.filter((t) => t.verification !== null);
    const verificationPassed = withVerification.filter(
      (t) => t.verification?.passed
    ).length;

    return {
      totalRequests: total,
      successRate: successful / total,
      avgLatencyMs: Math.round(totalLatency / total),
      avgTokensPerRequest: Math.round(totalTokens / total),
      totalTokens,
      estimatedTotalCostUsd: Math.round(totalCost * 10000) / 10000,
      toolUsageCount,
      verificationPassRate:
        withVerification.length > 0
          ? verificationPassed / withVerification.length
          : 0
    };
  }

  public clear(): void {
    this.traces = [];
  }
}
