export interface XRayRulesSettings {
  AccountClusterRiskCurrentInvestment?: RuleSettings;
  AccountClusterRiskSingleAccount?: RuleSettings;
  AllocationClusterRiskDevelopedMarkets?: RuleSettings;
  AllocationClusterRiskEmergingMarkets?: RuleSettings;
  CurrencyClusterRiskBaseCurrencyCurrentInvestment?: RuleSettings;
  CurrencyClusterRiskCurrentInvestment?: RuleSettings;
  EmergencyFundSetup?: RuleSettings;
  FeeRatioInitialInvestment?: RuleSettings;
}

interface RuleSettings {
  isActive: boolean;
  thresholdMax?: number;
  thresholdMin?: number;
}
