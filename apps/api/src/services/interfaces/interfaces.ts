import { UNKNOWN_KEY } from '@ghostfolio/helper';
import { Account, Currency, DataSource } from '@prisma/client';

import { OrderType } from '../../models/order-type';

export const Industry = {
  Automotive: 'Automotive',
  Biotechnology: 'Biotechnology',
  Food: 'Food',
  Internet: 'Internet',
  Pharmaceutical: 'Pharmaceutical',
  Software: 'Software',
  Unknown: UNKNOWN_KEY
};

export const MarketState = {
  closed: 'closed',
  delayed: 'delayed',
  open: 'open'
};

export const Sector = {
  Consumer: 'Consumer',
  Healthcare: 'Healthcare',
  Technology: 'Technology',
  Unknown: UNKNOWN_KEY
};

export const Type = {
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
  quantity: number;
  symbol: string;
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
  industry?: Industry;
  marketChange?: number;
  marketChangePercent?: number;
  marketPrice: number;
  marketState: MarketState;
  name: string;
  sector?: Sector;
  type?: Type;
  url?: string;
}

export type Industry = typeof Industry[keyof typeof Industry];

export type MarketState = typeof MarketState[keyof typeof MarketState];

export type Sector = typeof Sector[keyof typeof Sector];

export type Type = typeof Type[keyof typeof Type];
