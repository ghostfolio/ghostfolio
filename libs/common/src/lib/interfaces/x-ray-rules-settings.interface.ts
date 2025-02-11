export interface XRayRulesSettings {
  AccountClusterRiskCurrentInvestment?: RuleSettings;
  AccountClusterRiskSingleAccount?: RuleSettings;
  AssetClassClusterRiskEquity?: RuleSettings;
  AssetClassClusterRiskFixedIncome?: RuleSettings;
  CurrencyClusterRiskBaseCurrencyCurrentInvestment?: RuleSettings;
  CurrencyClusterRiskCurrentInvestment?: RuleSettings;
  EconomicMarketClusterRiskDevelopedMarkets?: RuleSettings;
  EconomicMarketClusterRiskEmergingMarkets?: RuleSettings;
  EmergencyFundSetup?: RuleSettings;
  FeeRatioInitialInvestment?: RuleSettings;
  RegionalMarketClusterRiskEmergingMarkets?: RuleSettings;
  RegionalMarketClusterRiskEurope?: RuleSettings;
  RegionalMarketClusterRiskJapan?: RuleSettings;
  RegionalMarketClusterRiskNorthAmerica?: RuleSettings;
}

interface RuleSettings {
  isActive: boolean;
  thresholdMax?: number;
  thresholdMin?: number;
}
