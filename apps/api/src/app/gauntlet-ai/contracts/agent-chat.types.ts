export type AgentToolName =
  | 'portfolio_analysis'
  | 'allocation_breakdown'
  | 'risk_flags';

export interface AgentChatRequest {
  message: string;
  sessionId: string;
}

export interface AgentCitation {
  keys: string[];
  tool: AgentToolName;
}

export interface AgentToolRun {
  durationMs: number;
  status: 'error' | 'success';
  toolName: AgentToolName;
}

export interface AgentChatResponse {
  answer: string;
  confidence: 'high' | 'low' | 'medium';
  citations: AgentCitation[];
  latencyMs: number;
  needsHumanReview: boolean;
  toolRuns: AgentToolRun[];
  traceId: string;
  warnings: string[];
}

export interface AgentToolEnvelope<TInput = unknown, TOutput = unknown> {
  attempt: number;
  durationMs: number;
  error?: string;
  input: TInput;
  output?: TOutput;
  status: 'error' | 'success';
  toolName: AgentToolName;
  traceId: string;
}

export interface SessionMessage {
  content: string;
  role: 'assistant' | 'user';
  timestamp: number;
}
