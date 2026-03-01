// Verification metadata

export interface VerificationConfidence {
  /** 0.0 - 1.0 */
  score: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

export interface VerificationFactCheck {
  passed: boolean;
  verifiedCount: number;
  unverifiedCount: number;
  derivedCount: number;
}

export interface VerificationHallucination {
  detected: boolean;
  /** 0.0 - 1.0 */
  rate: number;
  flaggedClaims: string[];
}

export interface VerificationMetadata {
  confidence: VerificationConfidence;
  factCheck: VerificationFactCheck;
  hallucination: VerificationHallucination;
  disclaimers: string[];
  domainViolations: string[];
  dataFreshnessMs: number;
  verificationDurationMs: number;
}

// Tool call record (used by verification and eval framework)

export interface ToolCallRecord {
  toolName: string;
  timestamp: Date;
  inputArgs: Record<string, unknown>;
  outputData: unknown;
  success: boolean;
  durationMs: number;
}

// Usage tracking

export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

// Error codes

export type AgentErrorCode =
  | 'AGENT_NOT_CONFIGURED'
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'BUDGET_EXCEEDED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR'
  | 'SESSION_EXPIRED'
  | 'STREAM_INCOMPLETE';

// SSE event types

export type AgentStreamEvent =
  | { type: 'content_delta'; text: string }
  | { type: 'reasoning_delta'; text: string }
  | {
      type: 'content_replace';
      content: string;
      corrections: Array<{ original: string; corrected: string }>;
    }
  | {
      type: 'tool_use_start';
      toolName: string;
      toolId: string;
      input: unknown;
    }
  | {
      type: 'tool_result';
      toolId: string;
      success: boolean;
      duration_ms: number;
      result: unknown;
    }
  | { type: 'verifying'; status: 'verifying' }
  | {
      type: 'confidence';
      level: 'high' | 'medium' | 'low';
      score: number;
      reasoning: string;
      factCheck: {
        passed: boolean;
        verifiedCount: number;
        unverifiedCount: number;
        derivedCount: number;
      };
      hallucination: {
        detected: boolean;
        rate: number;
        flaggedClaims: string[];
      };
      dataFreshnessMs: number;
      verificationDurationMs: number;
    }
  | { type: 'disclaimer'; disclaimers: string[]; domainViolations: string[] }
  | { type: 'correction'; message: string }
  | { type: 'suggestions'; suggestions: string[] }
  | {
      type: 'done';
      sessionId: string;
      conversationId: string;
      messageId: string;
      usage: AgentUsage;
      model?: string;
      interactionId?: string;
      degradationLevel?: 'full' | 'partial' | 'minimal';
    }
  | {
      type: 'conversation_title';
      conversationId: string;
      title: string;
    }
  | {
      type: 'error';
      code: AgentErrorCode;
      message: string;
      retryAfterMs?: number;
    };

// Chat method params

export interface AgentChatParams {
  message: string;
  sessionId?: string;
  conversationId?: string;
  userId: string;
  userCurrency: string;
  languageCode: string;
  /** Hook to intercept tool calls during execution (e.g. for eval) */
  onToolCall?: (record: ToolCallRecord) => void;
  /** Override default maxTurns (default: 10) */
  maxTurns?: number;
  /** Override default maxBudgetUsd (default: 0.05) */
  maxBudgetUsd?: number;
}
