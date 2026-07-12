import { Activity, User } from '@ghostfolio/common/interfaces';

import { Account } from '@prisma/client';

export interface CreateOrUpdateActivityDialogParams {
  accounts: Account[];
  activity: Partial<Omit<Activity, 'SymbolProfile' | 'id' | 'unitPrice'>> & {
    id: string | null;
    unitPrice: number | null;
    SymbolProfile: Activity['SymbolProfile'] | null;
  };
  user: User;
}
