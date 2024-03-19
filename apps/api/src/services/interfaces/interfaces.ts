import { DataProviderInfo, UniqueAsset } from '@ghostfolio/common/interfaces';
import { MarketState } from '@ghostfolio/common/types';

import {
  Account,
  DataSource,
  SymbolProfile,
  Type as ActivityType
} from '@prisma/client';

export interface IOrder {
  account: Account;
  currency: string;
  date: string;
  fee: number;
  id?: string;
  isDraft: boolean;
  quantity: number;
  symbol: string;
  symbolProfile: SymbolProfile;
  type: ActivityType;
  unitPrice: number;
}

export interface IDataProviderHistoricalResponse {
  marketPrice: number;
}

export interface IDataProviderResponse {
  currency: string;
  dataProviderInfo?: DataProviderInfo;
  dataSource: DataSource;
  marketPrice: number;
  marketState: MarketState;
}

export interface IDataGatheringItem extends UniqueAsset {
  date?: Date;
}
