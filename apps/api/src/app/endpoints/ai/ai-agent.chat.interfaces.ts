import { DataSource } from '@prisma/client';

import { AiAgentToolCall } from './ai-agent.interfaces';

export interface AiAgentMemoryState {
  turns: {
    answer: string;
    query: string;
    timestamp: string;
    toolCalls: Pick<AiAgentToolCall, 'status' | 'tool'>[];
  }[];
}

export type AiAgentResponseStylePreference = 'concise' | 'detailed';

export interface AiAgentUserPreferenceState {
  responseStyle?: AiAgentResponseStylePreference;
  updatedAt?: string;
}

export interface PortfolioAnalysisResult {
  allocationSum: number;
  holdings: {
    allocationInPercentage: number;
    dataSource: DataSource;
    symbol: string;
    valueInBaseCurrency: number;
  }[];
  holdingsCount: number;
  totalValueInBaseCurrency: number;
}

export interface RiskAssessmentResult {
  concentrationBand: 'high' | 'medium' | 'low';
  hhi: number;
  topHoldingAllocation: number;
}

export interface MarketDataLookupResult {
  quotes: {
    currency: string;
    marketPrice: number;
    marketState: string;
    symbol: string;
  }[];
  symbolsRequested: string[];
}

export interface RebalancePlanResult {
  maxAllocationTarget: number;
  overweightHoldings: {
    currentAllocation: number;
    reductionNeeded: number;
    symbol: string;
  }[];
  underweightHoldings: {
    currentAllocation: number;
    symbol: string;
  }[];
}

export interface StressTestResult {
  estimatedDrawdownInBaseCurrency: number;
  estimatedPortfolioValueAfterShock: number;
  longExposureInBaseCurrency: number;
  shockPercentage: number;
}
