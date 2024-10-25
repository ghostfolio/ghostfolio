import { PortfolioReportRule } from '@ghostfolio/common/interfaces';
import { XRayRulesSettings } from '@ghostfolio/common/interfaces';

export interface IRuleSettingsDialogParams {
  rule: PortfolioReportRule;
  settings: XRayRulesSettings['AccountClusterRiskCurrentInvestment'];
}
