import { EnhancedSymbolProfile } from '@ghostfolio/common/interfaces';
import { AccountWithPlatform } from '@ghostfolio/common/types';

import { Order, Tag } from '@prisma/client';

export interface Activities {
  activities: Activity[];
  count: number;
}

export interface Activity extends Order {
  Account?: AccountWithPlatform;
  error?: ActivityError;
  feeInAssetProfileCurrency: number;
  SymbolProfile?: EnhancedSymbolProfile;
  tags?: Tag[];
  unitPriceInAssetProfileCurrency: number;
  updateAccountBalance?: boolean;
  value: number;
  feeInBaseCurrency: number;
  valueInBaseCurrency: number;
}

export interface ActivityError {
  code: 'IS_DUPLICATE';
  message?: string;
}
