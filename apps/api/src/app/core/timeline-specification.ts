export type Accuracy = 'year' | 'month' | 'day';

export interface TimelineSpecification {
  start: string;
  accuracy: Accuracy;
}
