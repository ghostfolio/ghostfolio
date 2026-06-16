export interface LineChartItem<T = number> {
  date: string;
  value: T;
}

export type NullableLineChartItem = LineChartItem<number | null>;
