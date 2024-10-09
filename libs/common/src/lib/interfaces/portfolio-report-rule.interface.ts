export interface PortfolioReportRule {
  evaluation?: string;
  isActive: boolean;
  key: string;
  name: string;
  settings?: {
    thresholdMax: boolean;
    thresholdMin: boolean;
  };
  value?: boolean;
}
