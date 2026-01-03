import {
  PortfolioReportRule,
  XRayRulesSettings
} from '@ghostfolio/common/interfaces';

export interface RuleSettingsDialogParams {
  categoryName: string;
  locale: string;
  rule: PortfolioReportRule;
  settings: XRayRulesSettings['AccountClusterRiskCurrentInvestment'];
}
