import { PortfolioReportRule } from '../portfolio-report-rule.interface';

export interface PortfolioReportResponse {
  xRay: {
    rules: { [group: string]: PortfolioReportRule[] };
    statistics: {
      rulesActiveCount: number;
      rulesFulfilledCount: number;
    };
  };
}
