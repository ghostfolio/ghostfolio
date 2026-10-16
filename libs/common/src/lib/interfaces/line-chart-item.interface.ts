export interface LineChartItem<T = number> {
  amount?: number;
  date: string;
  quantity?: number;
  value: T;
}

export type NullableLineChartItem = LineChartItem<number | null>;
