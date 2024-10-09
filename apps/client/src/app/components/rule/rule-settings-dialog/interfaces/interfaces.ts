import { PortfolioReportRule } from '@ghostfolio/common/interfaces';
import { XRayRulesSettings } from '@ghostfolio/common/types';

export interface IRuleSettingsDialogParams {
  rule: PortfolioReportRule;
  settings: XRayRulesSettings['AccountClusterRiskCurrentInvestment'];
}
