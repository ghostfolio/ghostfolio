export interface XRayRulesSettings {
  AccountClusterRiskCurrentInvestment?: RuleSettings;
  AccountClusterRiskSingleAccount?: RuleSettings;
  AssetClassClusterRiskEquity?: RuleSettings;
  AssetClassClusterRiskFixedIncome?: RuleSettings;
  CurrencyClusterRiskBaseCurrencyCurrentInvestment?: RuleSettings;
  CurrencyClusterRiskCurrentInvestment?: RuleSettings;
  EconomicMarketClusterRiskDevelopedMarkets?: RuleSettings;
  EconomicMarketClusterRiskEmergingMarkets?: RuleSettings;
  RegionalMarketClusterRisk?: RuleSettings;
  EmergencyFundSetup?: RuleSettings;
  FeeRatioInitialInvestment?: RuleSettings;
}

interface RuleSettings {
  isActive: boolean;
  thresholdMax?: number;
  thresholdMin?: number;
}
