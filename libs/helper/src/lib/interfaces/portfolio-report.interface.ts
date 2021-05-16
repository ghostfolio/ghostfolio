import { PortfolioReportRule } from './portfolio-report-rule.interface';

export interface PortfolioReport {
  rules: { [group: string]: PortfolioReportRule[] };
}
