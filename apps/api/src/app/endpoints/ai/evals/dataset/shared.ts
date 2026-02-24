import { DataSource } from '@prisma/client';

import {
  AiAgentMvpEvalCase,
  AiAgentMvpEvalCaseExpected,
  AiAgentMvpEvalCaseInput,
  AiAgentMvpEvalCaseSetup,
  AiAgentMvpEvalCategory,
  AiAgentMvpEvalHolding,
  AiAgentMvpEvalQuote
} from '../mvp-eval.interfaces';

export const DEFAULT_USER_ID = 'mvp-user';

export const DEFAULT_HOLDINGS: Record<string, AiAgentMvpEvalHolding> = {
  AAPL: {
    allocationInPercentage: 0.5,
    dataSource: DataSource.YAHOO,
    symbol: 'AAPL',
    valueInBaseCurrency: 5000
  },
  MSFT: {
    allocationInPercentage: 0.3,
    dataSource: DataSource.YAHOO,
    symbol: 'MSFT',
    valueInBaseCurrency: 3000
  },
  NVDA: {
    allocationInPercentage: 0.2,
    dataSource: DataSource.YAHOO,
    symbol: 'NVDA',
    valueInBaseCurrency: 2000
  }
};

export const CONCENTRATED_HOLDINGS: Record<string, AiAgentMvpEvalHolding> = {
  AAPL: {
    allocationInPercentage: 0.72,
    dataSource: DataSource.YAHOO,
    symbol: 'AAPL',
    valueInBaseCurrency: 7200
  },
  MSFT: {
    allocationInPercentage: 0.18,
    dataSource: DataSource.YAHOO,
    symbol: 'MSFT',
    valueInBaseCurrency: 1800
  },
  BND: {
    allocationInPercentage: 0.1,
    dataSource: DataSource.YAHOO,
    symbol: 'BND',
    valueInBaseCurrency: 1000
  }
};

export const SINGLE_HOLDING: Record<string, AiAgentMvpEvalHolding> = {
  AAPL: {
    allocationInPercentage: 1,
    dataSource: DataSource.YAHOO,
    symbol: 'AAPL',
    valueInBaseCurrency: 10000
  }
};

export const ZERO_VALUE_HOLDINGS: Record<string, AiAgentMvpEvalHolding> = {
  AAPL: {
    allocationInPercentage: 0,
    dataSource: DataSource.YAHOO,
    symbol: 'AAPL',
    valueInBaseCurrency: 0
  },
  MSFT: {
    allocationInPercentage: 0,
    dataSource: DataSource.YAHOO,
    symbol: 'MSFT',
    valueInBaseCurrency: 0
  }
};

export const LEVERAGED_HOLDINGS: Record<string, AiAgentMvpEvalHolding> = {
  AAPL: {
    allocationInPercentage: 0.9,
    dataSource: DataSource.YAHOO,
    symbol: 'AAPL',
    valueInBaseCurrency: 9000
  },
  SQQQ: {
    allocationInPercentage: -0.4,
    dataSource: DataSource.YAHOO,
    symbol: 'SQQQ',
    valueInBaseCurrency: -4000
  }
};

export const EMPTY_HOLDINGS: Record<string, AiAgentMvpEvalHolding> = {};

export const DEFAULT_QUOTES: Record<string, AiAgentMvpEvalQuote> = {
  AAPL: {
    currency: 'USD',
    marketPrice: 213.34,
    marketState: 'REGULAR'
  },
  AMZN: {
    currency: 'USD',
    marketPrice: 190.21,
    marketState: 'REGULAR'
  },
  BND: {
    currency: 'USD',
    marketPrice: 73.12,
    marketState: 'REGULAR'
  },
  MSFT: {
    currency: 'USD',
    marketPrice: 462.15,
    marketState: 'REGULAR'
  },
  NVDA: {
    currency: 'USD',
    marketPrice: 901.22,
    marketState: 'REGULAR'
  },
  TSLA: {
    currency: 'USD',
    marketPrice: 247.8,
    marketState: 'REGULAR'
  },
  VTI: {
    currency: 'USD',
    marketPrice: 281.61,
    marketState: 'REGULAR'
  }
};

export const ONE_TURN_MEMORY = [
  {
    answer: 'Prior answer 1',
    query: 'Initial query',
    timestamp: '2026-02-23T10:00:00.000Z',
    toolCalls: [{ status: 'success' as const, tool: 'portfolio_analysis' as const }]
  }
];

export const TWO_TURN_MEMORY = [
  ...ONE_TURN_MEMORY,
  {
    answer: 'Prior answer 2',
    query: 'Follow-up query',
    timestamp: '2026-02-23T10:05:00.000Z',
    toolCalls: [{ status: 'success' as const, tool: 'risk_assessment' as const }]
  }
];

function buildLargeHoldings(): Record<string, AiAgentMvpEvalHolding> {
  const symbols = [
    'AAPL',
    'MSFT',
    'NVDA',
    'AMZN',
    'GOOGL',
    'META',
    'VTI',
    'VXUS',
    'BND',
    'QQQ',
    'AVGO',
    'ORCL',
    'CRM',
    'ADBE',
    'TSLA',
    'AMD',
    'IBM',
    'INTC',
    'CSCO',
    'SHOP'
  ];

  return symbols.reduce<Record<string, AiAgentMvpEvalHolding>>(
    (result, symbol) => {
      result[symbol] = {
        allocationInPercentage: 0.05,
        dataSource: DataSource.YAHOO,
        symbol,
        valueInBaseCurrency: 500
      };

      return result;
    },
    {}
  );
}

export const LARGE_HOLDINGS = buildLargeHoldings();

interface EvalCaseDefinition {
  category: AiAgentMvpEvalCategory;
  expected: AiAgentMvpEvalCaseExpected;
  id: string;
  input: Omit<AiAgentMvpEvalCaseInput, 'sessionId' | 'userId'> & {
    sessionId?: string;
    userId?: string;
  };
  intent: string;
  setup?: AiAgentMvpEvalCaseSetup;
}

export function createEvalCase({
  category,
  expected,
  id,
  input,
  intent,
  setup
}: EvalCaseDefinition): AiAgentMvpEvalCase {
  return {
    category,
    expected,
    id,
    input: {
      ...input,
      sessionId: input.sessionId ?? `mvp-eval-${id}`,
      userId: input.userId ?? DEFAULT_USER_ID
    },
    intent,
    setup: {
      holdings: DEFAULT_HOLDINGS,
      llmText: `Eval response for ${id}`,
      quotesBySymbol: DEFAULT_QUOTES,
      ...setup
    }
  };
}
