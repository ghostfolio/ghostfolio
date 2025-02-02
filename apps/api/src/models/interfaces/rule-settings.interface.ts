export interface RuleSettings {
  isActive: boolean;
}

export interface Settings extends RuleSettings {
  baseCurrency: string;
  thresholdMin: number;
  thresholdMax: number;
}
