import { OrderType } from '@ghostfolio/api/models/order-type';
import { DataSource } from '@prisma/client';
import Big from 'big.js';

export interface PortfolioOrder {
  currency: string;
  date: string;
  dataSource: DataSource;
  fee: Big;
  name: string;
  quantity: Big;
  symbol: string;
  type: OrderType;
  unitPrice: Big;
}
