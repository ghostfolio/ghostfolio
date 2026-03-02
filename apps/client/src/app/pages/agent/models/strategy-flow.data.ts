import {
  StrategyRecommendation,
  StrategyStep,
  StrategyStepId
} from './strategy-flow.types';

const STEP_ORDER: StrategyStepId[] = [
  'goals',
  'investmentAmount',
  'timeHorizon',
  'riskAppetite',
  'experience'
];

const STEPS: Record<StrategyStepId, StrategyStep> = {
  goals: {
    stepId: 'goals',
    question: "What's your primary investment goal?",
    options: [
      {
        label: 'Retire Early',
        value: 'retire_early',
        description: 'Build enough wealth to stop working before 60'
      },
      {
        label: 'Grow Wealth',
        value: 'grow_wealth',
        description: 'Maximize long-term portfolio growth'
      },
      {
        label: 'Generate Income',
        value: 'generate_income',
        description: 'Create a steady stream of passive income'
      },
      {
        label: 'Preserve Capital',
        value: 'preserve_capital',
        description: 'Protect what you have from inflation and loss'
      }
    ]
  },
  investmentAmount: {
    stepId: 'investmentAmount',
    question: 'How much do you have to invest?',
    options: [
      {
        label: 'Under $1K',
        value: 'under_1k',
        description: 'Just getting started with a small amount'
      },
      {
        label: '$1K - $10K',
        value: '1k_10k',
        description: 'Building a meaningful starter portfolio'
      },
      {
        label: '$10K - $50K',
        value: '10k_50k',
        description: 'Enough for a diversified portfolio'
      },
      {
        label: '$50K - $100K',
        value: '50k_100k',
        description: 'Substantial capital for broad allocation'
      },
      {
        label: '$100K+',
        value: '100k_plus',
        description: 'Significant assets requiring careful management'
      }
    ]
  },
  timeHorizon: {
    stepId: 'timeHorizon',
    question: "What's your investment time horizon?",
    options: [
      {
        label: 'Less than 1 year',
        value: 'lt_1y',
        description: 'Short-term — need access to funds soon'
      },
      {
        label: '1 - 5 years',
        value: '1_5y',
        description: 'Medium-term — saving for a goal in a few years'
      },
      {
        label: '5 - 15 years',
        value: '5_15y',
        description: 'Long-term — growing wealth over time'
      },
      {
        label: '15+ years',
        value: '15y_plus',
        description: 'Very long-term — retirement or generational wealth'
      }
    ]
  },
  riskAppetite: {
    stepId: 'riskAppetite',
    question: 'How would you feel if your portfolio dropped 20% in a month?',
    options: [
      {
        label: 'Panic sell',
        value: 'panic_sell',
        description: "I'd sell immediately to stop the bleeding"
      },
      {
        label: 'Worried but hold',
        value: 'worried_hold',
        description: "I'd be stressed but wouldn't sell"
      },
      {
        label: 'Stay the course',
        value: 'stay_course',
        description: "Downturns are normal, I'd do nothing"
      },
      {
        label: 'Buy the dip',
        value: 'buy_dip',
        description: "I'd see it as a buying opportunity"
      }
    ]
  },
  experience: {
    stepId: 'experience',
    question: 'How experienced are you with investing?',
    options: [
      {
        label: 'Beginner',
        value: 'beginner',
        description: 'New to investing, learning the basics'
      },
      {
        label: 'Some experience',
        value: 'some_experience',
        description: "I've made a few trades or own some funds"
      },
      {
        label: 'Intermediate',
        value: 'intermediate',
        description: 'Comfortable with stocks, ETFs, and diversification'
      },
      {
        label: 'Expert',
        value: 'expert',
        description:
          'Deep knowledge of markets, options, and advanced strategies'
      }
    ]
  },
  recommendation: {
    stepId: 'recommendation',
    question: ''
  }
};

export function getStep(stepId: StrategyStepId): StrategyStep {
  return STEPS[stepId];
}

export function getFirstStep(): StrategyStep {
  return STEPS[STEP_ORDER[0]];
}

export function getNextStepId(
  currentStepId: StrategyStepId
): StrategyStepId | null {
  const idx = STEP_ORDER.indexOf(currentStepId);
  if (idx < 0 || idx >= STEP_ORDER.length - 1) {
    return 'recommendation';
  }
  return STEP_ORDER[idx + 1];
}

export function computeRecommendation(
  answers: Record<string, string>
): StrategyRecommendation {
  let riskScore = 0;

  // Goals scoring
  const goalScores: Record<string, number> = {
    retire_early: 2,
    grow_wealth: 3,
    generate_income: 1,
    preserve_capital: 0
  };
  riskScore += goalScores[answers['goals']] ?? 1;

  // Time horizon scoring
  const horizonScores: Record<string, number> = {
    lt_1y: 0,
    '1_5y': 1,
    '5_15y': 2,
    '15y_plus': 3
  };
  riskScore += horizonScores[answers['timeHorizon']] ?? 1;

  // Risk appetite scoring
  const riskScores: Record<string, number> = {
    panic_sell: 0,
    worried_hold: 1,
    stay_course: 2,
    buy_dip: 3
  };
  riskScore += riskScores[answers['riskAppetite']] ?? 1;

  // Experience scoring
  const expScores: Record<string, number> = {
    beginner: 0,
    some_experience: 1,
    intermediate: 2,
    expert: 3
  };
  riskScore += expScores[answers['experience']] ?? 1;

  // Determine profile (max score = 12)
  if (riskScore <= 4) {
    return {
      title: 'Conservative: Dividend Income Portfolio',
      description:
        'Based on your preference for capital preservation and shorter time horizon, a conservative allocation focused on income-generating assets is recommended.',
      allocations: [
        { asset: 'Bonds (BND/AGG)', percent: 40, color: '#6b8cae' },
        { asset: 'Dividend Stocks (VYM/SCHD)', percent: 25, color: '#33ff99' },
        { asset: 'REITs (VNQ)', percent: 15, color: '#ff6600' },
        { asset: 'Money Market/Cash', percent: 10, color: '#888' },
        { asset: 'International Bonds (BNDX)', percent: 10, color: '#ffb84d' }
      ],
      riskLevel: 'Conservative'
    };
  } else if (riskScore <= 8) {
    return {
      title: 'Balanced: Core Satellite Strategy',
      description:
        'Your moderate risk tolerance and medium-to-long time horizon suit a balanced approach — broad index funds at the core with selective growth positions.',
      allocations: [
        { asset: 'US Total Market (VTI)', percent: 35, color: '#33ff99' },
        { asset: 'International (VXUS)', percent: 20, color: '#6b8cae' },
        { asset: 'Bonds (BND)', percent: 20, color: '#ffb84d' },
        { asset: 'Growth ETFs (QQQ/VUG)', percent: 15, color: '#ff6600' },
        { asset: 'REITs/Alternatives', percent: 10, color: '#888' }
      ],
      riskLevel: 'Moderate'
    };
  } else {
    return {
      title: 'Aggressive: Momentum Growth Portfolio',
      description:
        'Your high risk tolerance, long time horizon, and experience support an aggressive growth strategy focused on high-beta assets and sector concentration.',
      allocations: [
        { asset: 'Growth ETFs (QQQ/VUG)', percent: 30, color: '#ff6600' },
        { asset: 'US Total Market (VTI)', percent: 25, color: '#33ff99' },
        { asset: 'Sector ETFs (XLK/XLF)', percent: 20, color: '#ffb84d' },
        { asset: 'International Growth', percent: 15, color: '#6b8cae' },
        { asset: 'Small Cap (VB/IWM)', percent: 10, color: '#888' }
      ],
      riskLevel: 'Aggressive'
    };
  }
}
