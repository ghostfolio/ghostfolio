export type XRayRulesSettings = {
  AccountClusterRiskCurrentInvestment?: RuleSettings;
  AllocationClusterRiskEmergingMarkets?: RuleSettings;
  AccountClusterRiskSingleAccount?: RuleSettings;
  CurrencyClusterRiskBaseCurrencyCurrentInvestment?: RuleSettings;
  CurrencyClusterRiskCurrentInvestment?: RuleSettings;
  EmergencyFundSetup?: RuleSettings;
  FeeRatioInitialInvestment?: RuleSettings;
};

interface RuleSettings {
  isActive: boolean;
  thresholdMax?: number;
  thresholdMin?: number;
}
