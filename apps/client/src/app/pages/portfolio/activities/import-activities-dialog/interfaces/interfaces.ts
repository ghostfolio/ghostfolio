import { User } from '@ghostfolio/common/interfaces';

import { Type } from '@prisma/client';

export interface ImportActivitiesDialogParams {
  activityTypes: Type[];
  deviceType: string;
  user: User;
}
