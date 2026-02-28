export interface XRayRulesSettings {
  AccountClusterRiskCurrentInvestment?: RuleSettings;
  AccountClusterRiskSingleAccount?: RuleSettings;
  AssetClassClusterRiskEquity?: RuleSettings;
  AssetClassClusterRiskFixedIncome?: RuleSettings;
  BuyingPower?: RuleSettings;
  CurrencyClusterRiskBaseCurrencyCurrentInvestment?: RuleSettings;
  CurrencyClusterRiskCurrentInvestment?: RuleSettings;
  EconomicMarketClusterRiskDevelopedMarkets?: RuleSettings;
  EconomicMarketClusterRiskEmergingMarkets?: RuleSettings;
  EmergencyFundSetup?: RuleSettings;
  FeeRatioTotalInvestmentVolume?: RuleSettings;
  RegionalMarketClusterRiskAsiaPacific?: RuleSettings;
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
