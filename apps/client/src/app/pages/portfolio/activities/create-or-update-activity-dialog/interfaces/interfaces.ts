import type { Activity, User } from '@ghostfolio/common/interfaces';
import type { AccountWithPlatform } from '@ghostfolio/common/types';

export interface CreateOrUpdateActivityDialogParams {
  accounts: AccountWithPlatform[];
  activity: Partial<Omit<Activity, 'assetProfile' | 'id' | 'unitPrice'>> & {
    assetProfile: Activity['assetProfile'] | null;
    id: string | null;
    unitPrice: number | null;
  };
  user: User;
}
