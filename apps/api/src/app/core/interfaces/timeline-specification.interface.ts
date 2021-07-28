export type Accuracy = 'day' | 'month' | 'year';

export interface TimelineSpecification {
  accuracy: Accuracy;
  start: string;
}
