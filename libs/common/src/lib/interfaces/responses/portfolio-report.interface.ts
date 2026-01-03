import { PortfolioReportRule } from '../portfolio-report-rule.interface';

export interface PortfolioReportResponse {
  xRay: {
    categories: {
      key: string;
      name: string;
      rules: PortfolioReportRule[];
    }[];
    statistics: {
      rulesActiveCount: number;
      rulesFulfilledCount: number;
    };
  };
}
