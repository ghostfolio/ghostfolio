import { NullableLineChartItem } from './line-chart-item.interface';

export interface BenchmarkSeries {
  id: string;
  items: NullableLineChartItem[];
  name: string;
}
