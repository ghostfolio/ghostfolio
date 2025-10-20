export interface GetColorParams {
  annualizedNetPerformancePercent: number;
  negativeNetPerformancePercentsRange: { max: number; min: number };
  positiveNetPerformancePercentsRange: { max: number; min: number };
}
