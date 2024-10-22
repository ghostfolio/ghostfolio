export interface ColorConfig {
  backgroundColor: string;
  fontColor: string;
}

export interface GetColorConfigParams {
  annualizedNetPerformancePercent: number;
  negativeNetPerformancePercentsRange: { max: number; min: number };
  positiveNetPerformancePercentsRange: { max: number; min: number };
}
