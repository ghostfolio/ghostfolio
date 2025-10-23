import { EnhancedSymbolProfile } from '@ghostfolio/common/interfaces';
import { AccountWithPlatform } from '@ghostfolio/common/types';

import { Order, Tag } from '@prisma/client';

export interface ActivitiesResponse {
  activities: ActivityResponse[];
  count: number;
}

export interface ActivityResponse extends Order {
  account?: AccountWithPlatform;
  error?: ActivityErrorResponse;
  feeInAssetProfileCurrency: number;
  feeInBaseCurrency: number;
  SymbolProfile?: EnhancedSymbolProfile;
  tagIds?: string[];
  tags?: Tag[];
  unitPriceInAssetProfileCurrency: number;
  updateAccountBalance?: boolean;
  value: number;
  valueInBaseCurrency: number;
}

export interface ActivityErrorResponse {
  code: 'IS_DUPLICATE';
  message?: string;
}
