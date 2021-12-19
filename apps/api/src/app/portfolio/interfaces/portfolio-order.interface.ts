import { DataSource, Type as TypeOfOrder } from '@prisma/client';
import Big from 'big.js';

export interface PortfolioOrder {
  currency: string;
  date: string;
  dataSource: DataSource;
  fee: Big;
  name: string;
  quantity: Big;
  symbol: string;
  type: TypeOfOrder;
  unitPrice: Big;
}
