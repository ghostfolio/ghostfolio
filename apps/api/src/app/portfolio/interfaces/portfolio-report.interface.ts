export interface PortfolioReport {
  rules: { [group: string]: PortfolioReportRule[] };
}

export interface PortfolioReportRule {
  evaluation: string;
  name: string;
  value: boolean;
}
