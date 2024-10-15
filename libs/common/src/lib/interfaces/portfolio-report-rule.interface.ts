export interface PortfolioReportRule {
  configuration?: {
    threshold?: {
      max: number;
      min: number;
      step: number;
    };
    thresholdMax?: boolean;
    thresholdMin?: boolean;
  };
  evaluation?: string;
  isActive: boolean;
  key: string;
  name: string;
  value?: boolean;
}
