import { Activity, User } from '@ghostfolio/common/interfaces';

import { Account } from '@prisma/client';

export interface CreateOrUpdateActivityDialogParams {
  accounts: Account[];
  activity: Partial<Omit<Activity, 'assetProfile' | 'id' | 'unitPrice'>> & {
    assetProfile: Activity['assetProfile'] | null;
    id: string | null;
    unitPrice: number | null;
  };
  user: User;
}
