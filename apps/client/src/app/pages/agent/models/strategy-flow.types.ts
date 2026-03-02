export type StrategyStepId =
  | 'goals'
  | 'investmentAmount'
  | 'timeHorizon'
  | 'riskAppetite'
  | 'experience'
  | 'recommendation';

export interface StrategyOption {
  label: string;
  value: string;
  description?: string;
}

export interface StrategyAllocation {
  asset: string;
  percent: number;
  color: string;
}

export interface StrategyRecommendation {
  title: string;
  description: string;
  allocations: StrategyAllocation[];
  riskLevel: string;
}

export interface StrategyStep {
  stepId: StrategyStepId;
  question: string;
  options?: StrategyOption[];
  recommendation?: StrategyRecommendation;
}
