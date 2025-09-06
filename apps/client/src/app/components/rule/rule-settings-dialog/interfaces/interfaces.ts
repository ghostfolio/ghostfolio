import {
  PortfolioReportRule,
  XRayRulesSettings
} from '@ghostfolio/common/interfaces';

export interface IRuleSettingsDialogParams {
  categoryName: string;
  rule: PortfolioReportRule;
  settings: XRayRulesSettings['AccountClusterRiskCurrentInvestment'];
}
