import { User } from '@ghostfolio/common/interfaces';
import type { Type } from '@ghostfolio/prisma/enums';

export interface ImportActivitiesDialogParams {
  activityTypes?: Type[];
  deviceType: string;
  user: User;
}
