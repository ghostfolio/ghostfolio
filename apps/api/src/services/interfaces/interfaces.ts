import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { Account, Currency, DataSource, SymbolProfile } from '@prisma/client';

import { OrderType } from '../../models/order-type';

export const MarketState = {
  closed: 'closed',
  delayed: 'delayed',
  open: 'open'
};

export const Type = {
  Cash: 'Cash',
  Cryptocurrency: 'Cryptocurrency',
  ETF: 'ETF',
  Stock: 'Stock',
  Unknown: UNKNOWN_KEY
};

export interface IOrder {
  account: Account;
  currency: Currency;
  date: string;
  fee: number;
  id?: string;
  isDraft: boolean;
  quantity: number;
  symbol: string;
  symbolProfile: SymbolProfile;
  type: OrderType;
  unitPrice: number;
}

export interface IDataProviderHistoricalResponse {
  marketPrice: number;
  performance?: number;
}

export interface IDataProviderResponse {
  currency: Currency;
  dataSource: DataSource;
  exchange?: string;
  marketChange?: number;
  marketChangePercent?: number;
  marketPrice: number;
  marketState: MarketState;
  name: string;
  type?: Type;
  url?: string;
}

export interface IDataGatheringItem {
  dataSource: DataSource;
  date?: Date;
  symbol: string;
}

export type MarketState = typeof MarketState[keyof typeof MarketState];

export type Type = typeof Type[keyof typeof Type];
