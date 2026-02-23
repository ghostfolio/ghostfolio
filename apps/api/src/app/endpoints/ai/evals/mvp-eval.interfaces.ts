import { DataSource } from '@prisma/client';

import {
  AiAgentChatResponse,
  AiAgentToolName
} from '../ai-agent.interfaces';

export interface AiAgentMvpEvalQuote {
  currency: string;
  marketPrice: number;
  marketState: string;
}

export interface AiAgentMvpEvalHolding {
  allocationInPercentage: number;
  dataSource: DataSource;
  symbol: string;
  valueInBaseCurrency: number;
}

export interface AiAgentMvpEvalMemoryTurn {
  answer: string;
  query: string;
  timestamp: string;
  toolCalls: {
    status: 'success' | 'failed';
    tool: AiAgentToolName;
  }[];
}

export interface AiAgentMvpEvalCaseInput {
  languageCode?: string;
  query: string;
  sessionId: string;
  symbols?: string[];
  userCurrency?: string;
  userId: string;
}

export interface AiAgentMvpEvalCaseSetup {
  holdings?: Record<string, AiAgentMvpEvalHolding>;
  llmText?: string;
  llmThrows?: boolean;
  marketDataErrorMessage?: string;
  quotesBySymbol?: Record<string, AiAgentMvpEvalQuote>;
  storedMemoryTurns?: AiAgentMvpEvalMemoryTurn[];
}

export interface AiAgentMvpEvalToolExpectation {
  status?: 'success' | 'failed';
  tool: AiAgentToolName;
}

export interface AiAgentMvpEvalVerificationExpectation {
  check: string;
  status?: 'passed' | 'warning' | 'failed';
}

export interface AiAgentMvpEvalCaseExpected {
  answerIncludes?: string[];
  confidenceScoreMin?: number;
  forbiddenTools?: AiAgentToolName[];
  memoryTurnsAtLeast?: number;
  minCitations?: number;
  requiredTools?: AiAgentToolName[];
  requiredToolCalls?: AiAgentMvpEvalToolExpectation[];
  verificationChecks?: AiAgentMvpEvalVerificationExpectation[];
}

export interface AiAgentMvpEvalCase {
  expected: AiAgentMvpEvalCaseExpected;
  id: string;
  input: AiAgentMvpEvalCaseInput;
  intent: string;
  setup: AiAgentMvpEvalCaseSetup;
}

export interface AiAgentMvpEvalResult {
  durationInMs: number;
  failures: string[];
  id: string;
  passed: boolean;
  response?: AiAgentChatResponse;
}
