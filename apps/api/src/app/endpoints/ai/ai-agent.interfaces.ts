export type AiAgentToolName =
  | 'portfolio_analysis'
  | 'risk_assessment'
  | 'market_data_lookup'
  | 'rebalance_plan'
  | 'stress_test';

export type AiAgentConfidenceBand = 'high' | 'medium' | 'low';

export interface AiAgentCitation {
  confidence: number;
  snippet: string;
  source: AiAgentToolName;
}

export interface AiAgentConfidence {
  band: AiAgentConfidenceBand;
  score: number;
}

export interface AiAgentVerificationCheck {
  check: string;
  details: string;
  status: 'passed' | 'warning' | 'failed';
}

export interface AiAgentToolCall {
  input: Record<string, unknown>;
  outputSummary: string;
  status: 'success' | 'failed';
  tool: AiAgentToolName;
}

export interface AiAgentMemorySnapshot {
  sessionId: string;
  turns: number;
}

export interface AiAgentChatResponse {
  answer: string;
  citations: AiAgentCitation[];
  confidence: AiAgentConfidence;
  memory: AiAgentMemorySnapshot;
  toolCalls: AiAgentToolCall[];
  verification: AiAgentVerificationCheck[];
}
