import {
  transformToBig,
  transformToMapOfBig
} from '@ghostfolio/common/class-transformer';
import { DateRange } from '@ghostfolio/common/types';

import { DataSource, Tag } from '@prisma/client';
import { Big } from 'big.js';
import { Transform, Type } from 'class-transformer';

export class TimelinePosition {
  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  averagePrice: Big;

  currency: string;
  dataSource: DataSource;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  dividend: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  dividendInBaseCurrency: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  fee: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  feeInBaseCurrency: Big;

  firstBuyDate: string;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  grossPerformance: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  grossPerformancePercentage: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  grossPerformancePercentageWithCurrencyEffect: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  grossPerformanceWithCurrencyEffect: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  investment: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  investmentWithCurrencyEffect: Big;

  marketPrice: number;
  marketPriceInBaseCurrency: number;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  netPerformance: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  netPerformancePercentage: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  netPerformancePercentageWithCurrencyEffect: Big;

  @Transform(transformToMapOfBig, { toClassOnly: true })
  netPerformancePercentageWithCurrencyEffectMap: { [key: DateRange]: Big };

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  netPerformanceWithCurrencyEffect: Big;

  @Transform(transformToMapOfBig, { toClassOnly: true })
  netPerformanceWithCurrencyEffectMap: { [key: DateRange]: Big };

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  quantity: Big;

  symbol: string;
  tags?: Tag[];

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  timeWeightedInvestment: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  timeWeightedInvestmentWithCurrencyEffect: Big;

  transactionCount: number;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  valueInBaseCurrency: Big;
}
