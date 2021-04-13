import { LineChartItem } from '../../line-chart/interfaces/line-chart.interface';

export interface PositionDetailDialogParams {
  deviceType: string;
  fearAndGreedIndex: number;
  historicalDataItems: LineChartItem[];
}
