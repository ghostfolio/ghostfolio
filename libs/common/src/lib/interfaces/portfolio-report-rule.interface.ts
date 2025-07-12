export interface PortfolioReportRule {
  category?: string;
  configuration?: {
    threshold?: {
      max: number;
      min: number;
      step: number;
      unit?: string;
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
