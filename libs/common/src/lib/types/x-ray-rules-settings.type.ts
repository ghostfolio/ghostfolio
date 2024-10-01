import { PortfolioReportRule } from '@ghostfolio/common/interfaces';

export type XRayRulesSettings = {
  AccountClusterRiskCurrentInvestment?: RuleSettings;
  AccountClusterRiskSingleAccount?: RuleSettings;
  CurrencyClusterRiskBaseCurrencyCurrentInvestment?: RuleSettings;
  CurrencyClusterRiskCurrentInvestment?: RuleSettings;
  EmergencyFundSetup?: RuleSettings;
  FeeRatioInitialInvestment?: RuleSettings;
};

interface RuleSettings extends Pick<PortfolioReportRule, 'settings'> {
  isActive: boolean;
}
