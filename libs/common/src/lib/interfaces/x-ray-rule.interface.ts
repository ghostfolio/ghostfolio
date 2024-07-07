export interface XRayRules {
  AccountClusterRiskCurrentInvestment?: Rule;
  AccountClusterRiskSingleAccount?: Rule;
  CurrencyClusterRiskBaseCurrencyCurrentInvestment?: Rule;
  CurrencyClusterRiskCurrentInvestment?: Rule;
  EmergencyFundSetup?: Rule;
  FeeRatioInitialInvestment?: Rule;
}

interface Rule {
  isActive: boolean;
}
