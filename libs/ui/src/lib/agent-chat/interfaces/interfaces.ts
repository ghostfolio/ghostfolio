// SSE event types matching backend AgentStreamEvent

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

export type SSEEvent =
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
      level: string;
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
      usage: { inputTokens: number; outputTokens: number; costUsd: number };
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

// Chat message model

export interface ToolUsed {
  toolName: string;
  toolId: string;
  success?: boolean;
  durationMs?: number;
}

export interface ChatMessageConfidence {
  level: 'high' | 'medium' | 'low';
  score: number;
}

export interface ReasoningPhase {
  startTime: number;
  endTime?: number;
  startOffset: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  streamingHtml?: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
  isVerifying?: boolean;
  currentToolName?: string;
  toolsUsed?: ToolUsed[];
  confidence?: ChatMessageConfidence;
  disclaimers?: string[];
  domainViolations?: string[];
  correction?: string;
  reasoning?: string;
  isReasoningStreaming?: boolean;
  reasoningPhases?: ReasoningPhase[];
  totalReasoningDurationMs?: number;
  interactionId?: string;
  feedbackRating?: 'positive' | 'negative' | null;
  suggestions?: string[];
}

// Conversation history

export interface ConversationListItem {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationGroup {
  label: string;
  conversations: ConversationListItem[];
}

export interface ConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  toolsUsed?: ToolUsed[];
  confidence?: ChatMessageConfidence;
  disclaimers?: string[];
  createdAt: string;
}

// Feedback

export interface FeedbackPayload {
  interactionId: string;
  rating: 'positive' | 'negative';
  comment?: string;
}

// Tool display names

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  // Read-only portfolio tools
  get_portfolio_holdings: $localize`Portfolio Holdings`,
  get_portfolio_performance: $localize`Portfolio Performance`,
  get_portfolio_summary: $localize`Portfolio Summary`,
  get_market_allocation: $localize`Market Allocation`,
  get_account_details: $localize`Account Details`,
  get_dividends: $localize`Dividends`,
  run_portfolio_xray: $localize`Portfolio X-Ray`,
  get_holding_detail: $localize`Holding Detail`,
  get_activity_history: $localize`Activity History`,
  get_activity_detail: $localize`Activity Detail`,
  get_investment_timeline: $localize`Investment Timeline`,
  get_cash_balances: $localize`Cash Balances`,
  get_balance_history: $localize`Balance History`,
  // Market data & research
  lookup_symbol: $localize`Symbol Lookup`,
  get_quote: $localize`Market Quote`,
  get_benchmarks: $localize`Benchmarks`,
  compare_to_benchmark: $localize`Benchmark Comparison`,
  convert_currency: $localize`Currency Conversion`,
  get_platforms: $localize`Platforms`,
  get_fear_and_greed: $localize`Fear & Greed Index`,
  // Read-only lists
  get_watchlist: $localize`Watchlist`,
  get_tags: $localize`Tags`,
  suggest_dividends: $localize`Dividend Suggestions`,
  export_portfolio: $localize`Export Portfolio`,
  // User settings
  get_user_settings: $localize`User Settings`,
  update_user_settings: $localize`Update Settings`,
  // Write: activities
  create_activity: $localize`Create Activity`,
  update_activity: $localize`Update Activity`,
  delete_activity: $localize`Delete Activity`,
  // Write: accounts
  create_account: $localize`Create Account`,
  update_account: $localize`Update Account`,
  delete_account: $localize`Delete Account`,
  transfer_balance: $localize`Transfer Balance`,
  // Write: tags
  create_tag: $localize`Create Tag`,
  update_tag: $localize`Update Tag`,
  delete_tag: $localize`Delete Tag`,
  // Write: watchlist
  manage_watchlist: $localize`Manage Watchlist`
};

// Error messages for user display

export const ERROR_MESSAGES: Record<AgentErrorCode, string> = {
  AGENT_NOT_CONFIGURED: $localize`The AI assistant is not configured. Please contact your administrator.`,
  VALIDATION_ERROR: $localize`Invalid request. Please try again.`,
  AUTH_REQUIRED: $localize`Please sign in to use the AI assistant.`,
  BUDGET_EXCEEDED: $localize`Usage limit reached. Please try again later.`,
  RATE_LIMITED: $localize`Too many requests. Please wait a moment.`,
  TIMEOUT: $localize`Request timed out. Please try a simpler query.`,
  INTERNAL_ERROR: $localize`Something went wrong. Please try again.`,
  SESSION_EXPIRED: $localize`Your session has expired. Starting a new conversation.`,
  STREAM_INCOMPLETE: $localize`Response may be incomplete. Please try again.`
};

// Suggested prompts

export const SUGGESTED_PROMPTS: string[] = [
  $localize`How is my portfolio performing?`,
  $localize`What are my top holdings?`,
  $localize`Show me my dividend income`,
  $localize`Analyze my asset allocation`
];
