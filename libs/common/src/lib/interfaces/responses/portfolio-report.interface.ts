import { PortfolioReportRule } from '../portfolio-report-rule.interface';

export interface PortfolioReportResponse {
  'x-ray': {
    rules: { [group: string]: PortfolioReportRule[] };
    statistics: {
      rulesActiveCount: number;
      rulesFulfilledCount: number;
    };
  };
}
