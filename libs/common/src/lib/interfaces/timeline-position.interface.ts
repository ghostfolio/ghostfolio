import { DataSource, Tag } from '@prisma/client';
import { Big } from 'big.js';

export interface TimelinePosition {
  averagePrice: Big;
  currency: string;
  dataSource: DataSource;
  dividend: Big;
  dividendInBaseCurrency: Big;
  fee: Big;
  firstBuyDate: string;
  grossPerformance: Big;
  grossPerformancePercentage: Big;
  grossPerformancePercentageWithCurrencyEffect: Big;
  grossPerformanceWithCurrencyEffect: Big;
  investment: Big;
  investmentWithCurrencyEffect: Big;
  marketPrice: number;
  marketPriceInBaseCurrency: number;
  netPerformance: Big;
  netPerformancePercentage: Big;
  netPerformancePercentageWithCurrencyEffect: Big;
  netPerformanceWithCurrencyEffect: Big;
  quantity: Big;
  symbol: string;
  tags?: Tag[];
  timeWeightedInvestment: Big;
  timeWeightedInvestmentWithCurrencyEffect: Big;
  transactionCount: number;
  valueInBaseCurrency: Big;
}
