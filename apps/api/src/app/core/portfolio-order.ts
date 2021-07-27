import { Currency } from '@prisma/client';
import Big from 'big.js';
import { OrderType } from '@ghostfolio/api/models/order-type';

export interface PortfolioOrder {
  currency: Currency;
  date: string;
  name: string;
  quantity: Big;
  symbol: string;
  type: OrderType;
  unitPrice: Big;
}
