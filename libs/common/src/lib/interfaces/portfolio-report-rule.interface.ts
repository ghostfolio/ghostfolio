export interface PortfolioReportRule {
  configuration?: {
    thresholdMax: boolean;
    thresholdMin: boolean;
  };
  evaluation?: string;
  isActive: boolean;
  key: string;
  name: string;
  value?: boolean;
}
