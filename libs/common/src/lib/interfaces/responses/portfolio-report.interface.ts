import { PortfolioReportRule } from '../portfolio-report-rule.interface';

export interface PortfolioReportResponse {
  rules: { [group: string]: PortfolioReportRule[] };
  statistics: {
    rulesActiveCount: number;
    rulesFulfilledCount: number;
  };
}
