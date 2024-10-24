import { PortfolioReportRule } from './portfolio-report-rule.interface';

export interface PortfolioReport {
  rules: Record<string, PortfolioReportRule[]>;
}
