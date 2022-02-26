import {
  Account,
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile,
  Type as TypeOfOrder
} from '@prisma/client';

export const MarketState = {
  closed: 'closed',
  delayed: 'delayed',
  open: 'open'
};

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

export type MarketState = typeof MarketState[keyof typeof MarketState];
