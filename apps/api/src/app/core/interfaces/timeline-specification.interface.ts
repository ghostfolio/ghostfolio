export type Accuracy = 'year' | 'month' | 'day';

export interface TimelineSpecification {
  accuracy: Accuracy;
  start: string;
}
