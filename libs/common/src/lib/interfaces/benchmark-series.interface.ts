import { LineChartItem } from './line-chart-item.interface';

export interface BenchmarkSeries {
  id: string;
  items: LineChartItem[];
  name: string;
}
