export interface AiChatCitation {
  keys: string[];
  tool: 'allocation_breakdown' | 'portfolio_analysis' | 'risk_flags';
}

export interface AiChatToolRun {
  durationMs: number;
  status: 'error' | 'success';
  toolName: 'allocation_breakdown' | 'portfolio_analysis' | 'risk_flags';
}

export interface AiChatResponse {
  answer: string;
  citations: AiChatCitation[];
  confidence: 'high' | 'low' | 'medium';
  latencyMs: number;
  needsHumanReview: boolean;
  toolRuns: AiChatToolRun[];
  traceId: string;
  warnings: string[];
}
