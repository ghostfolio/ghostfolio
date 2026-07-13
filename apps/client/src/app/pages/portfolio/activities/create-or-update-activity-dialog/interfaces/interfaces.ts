import { Activity, User } from '@ghostfolio/common/interfaces';

import { Account } from '@prisma/client';

export interface CreateOrUpdateActivityDialogParams {
  accounts: Account[];
  activity: Partial<Omit<Activity, 'id' | 'SymbolProfile' | 'unitPrice'>> & {
    id: string | null;
    SymbolProfile: Activity['SymbolProfile'] | null;
    unitPrice: number | null;
  };
  user: User;
}
