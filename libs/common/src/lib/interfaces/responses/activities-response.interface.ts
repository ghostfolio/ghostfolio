import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';

export interface ActivitiesResponse {
  activities: Activity[];
  count: number;
}
