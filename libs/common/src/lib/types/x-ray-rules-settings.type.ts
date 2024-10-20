export type XRayRulesSettings = {
  AccountClusterRiskCurrentInvestment?: RuleSettings;
  AccountClusterRiskSingleAccount?: RuleSettings;
  AllocationClusterRiskEmergingMarkets?: RuleSettings;
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
