import { EnhancedSymbolProfile } from '@ghostfolio/common/interfaces';
import { AccountWithPlatform } from '@ghostfolio/common/types';

import { Order, Tag } from '@prisma/client';

export interface Activity extends Order {
  account?: AccountWithPlatform;
  error?: ActivityError;
  feeInAssetProfileCurrency: number;
  feeInBaseCurrency: number;
  SymbolProfile: EnhancedSymbolProfile;
  tagIds?: string[];
  tags?: Tag[];
  unitPriceInAssetProfileCurrency: number;
  updateAccountBalance?: boolean;
  value: number;
  valueInBaseCurrency: number;
}

export interface ActivityError {
  code: 'IS_DUPLICATE';
  message?: string;
}
