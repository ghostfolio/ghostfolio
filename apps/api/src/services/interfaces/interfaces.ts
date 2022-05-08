import { MarketState } from '@ghostfolio/common/types';
import {
  Account,
  DataSource,
  SymbolProfile,
  Type as TypeOfOrder
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
  type: TypeOfOrder;
  unitPrice: number;
}

export interface IDataProviderHistoricalResponse {
  marketPrice: number;
  performance?: number;
}

export interface IDataProviderResponse {
  currency: string;
  dataSource: DataSource;
  marketPrice: number;
  marketState: MarketState;
}

export interface IDataGatheringItem {
  dataSource: DataSource;
  date?: Date;
  symbol: string;
}
