import { Currency, Platform } from '@prisma/client';

import { OrderType } from '../../models/order-type';

export const Industry = {
  Automotive: 'Automotive',
  Biotechnology: 'Biotechnology',
  Food: 'Food',
  Internet: 'Internet',
  Other: 'Other',
  Pharmaceutical: 'Pharmaceutical',
  Software: 'Software'
};

export const MarketState = {
  closed: 'closed',
  delayed: 'delayed',
  open: 'open'
};

export const Sector = {
  Consumer: 'Consumer',
  Healthcare: 'Healthcare',
  Other: 'Other',
  Technology: 'Technology'
};

export const Type = {
  Cryptocurrency: 'Cryptocurrency',
  ETF: 'ETF',
  Other: 'Other',
  Stock: 'Stock'
};

export interface IOrder {
  currency: Currency;
  date: string;
  fee: number;
  id?: string;
  platform: Platform;
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
