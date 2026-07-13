import { Params } from '@angular/router';

export interface ActivitiesPageParams extends Params {
  activityId?: string;
  createDialog?: string;
  editDialog?: string;
}
