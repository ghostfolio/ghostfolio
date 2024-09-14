export interface PortfolioReportRule {
  evaluation?: string;
  isActive: boolean;
  key: string;
  name: string;
  settings?: {
    thresholdMax?: number;
    thresholdMin?: number;
  };
  value?: boolean;
}
