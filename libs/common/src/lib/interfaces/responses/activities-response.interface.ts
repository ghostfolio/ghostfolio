import { Activity } from '@ghostfolio/common/interfaces/activities.interface';

export interface ActivitiesResponse {
  activities: Activity[];
  count: number;
}
