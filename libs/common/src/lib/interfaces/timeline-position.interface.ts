import { DataSource } from '@prisma/client';
import Big from 'big.js';

export interface TimelinePosition {
  averagePrice: Big;
  currency: string;
  dataSource: DataSource;
  fee: Big;
  firstBuyDate: string;
  grossPerformance: Big;
  grossPerformancePercentage: Big;
  investment: Big;
  marketPrice: number;
  netPerformance: Big;
  netPerformancePercentage: Big;
  quantity: Big;
  symbol: string;
  transactionCount: number;
}
