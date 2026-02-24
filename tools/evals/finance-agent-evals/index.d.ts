export type FinanceEvalCategory =
  | 'happy_path'
  | 'edge_case'
  | 'adversarial'
  | 'multi_step';

export interface FinanceEvalExpectedToolCall {
  status?: 'success' | 'failed';
  tool: string;
}

export interface FinanceEvalExpectedVerification {
  check: string;
  status?: 'passed' | 'warning' | 'failed';
}

export interface FinanceEvalCase {
  category: FinanceEvalCategory;
  expected: {
    answerIncludes?: string[];
    confidenceScoreMin?: number;
    forbiddenTools?: string[];
    memoryTurnsAtLeast?: number;
    minCitations?: number;
    requiredToolCalls?: FinanceEvalExpectedToolCall[];
    requiredTools?: string[];
    verificationChecks?: FinanceEvalExpectedVerification[];
  };
  id: string;
  input: {
    languageCode?: string;
    query: string;
    sessionId: string;
    symbols?: string[];
    userCurrency?: string;
    userId: string;
  };
  intent: string;
  setup: Record<string, unknown>;
}

export interface FinanceEvalResponse {
  answer: string;
  citations?: unknown[];
  confidence?: { score?: number };
  memory?: { turns?: number };
  toolCalls?: { status: 'success' | 'failed'; tool: string }[];
  verification?: {
    check: string;
    status: 'passed' | 'warning' | 'failed';
  }[];
}

export interface FinanceEvalResult {
  durationInMs: number;
  failures: string[];
  id: string;
  passed: boolean;
  response?: FinanceEvalResponse;
}

export interface FinanceEvalCategorySummary {
  category: FinanceEvalCategory;
  passRate: number;
  passed: number;
  total: number;
}

export interface FinanceEvalSuiteResult {
  categorySummaries: FinanceEvalCategorySummary[];
  passRate: number;
  passed: number;
  results: FinanceEvalResult[];
  total: number;
}

export const FINANCE_AGENT_EVAL_DATASET: FinanceEvalCase[];
export const FINANCE_AGENT_EVAL_CATEGORIES: FinanceEvalCategory[];

export function evaluateFinanceAgentResponse({
  evalCase,
  response
}: {
  evalCase: FinanceEvalCase;
  response: FinanceEvalResponse;
}): string[];

export function summarizeFinanceAgentEvalByCategory({
  cases,
  results
}: {
  cases: FinanceEvalCase[];
  results: FinanceEvalResult[];
}): FinanceEvalCategorySummary[];

export function runFinanceAgentEvalSuite({
  cases,
  execute
}: {
  cases?: FinanceEvalCase[];
  execute: (evalCase: FinanceEvalCase) => Promise<FinanceEvalResponse>;
}): Promise<FinanceEvalSuiteResult>;

export function getFinanceAgentEvalCategoryCounts(
  cases?: FinanceEvalCase[]
): Record<FinanceEvalCategory, number>;
