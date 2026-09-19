import {
  transformToBig,
  transformToMapOfBig
} from '@ghostfolio/common/class-transformer';
import { DateRange } from '@ghostfolio/common/types';

import { DataSource, Tag } from '@prisma/client';
import { Big } from 'big.js';
import { Expose, Transform, Type } from 'class-transformer';

/**
 * @deprecated Backward compatibility to read the portfolio snapshots which
 * have been cached with the former name of the property
 *
 * TODO: Remove the fallback with the next release, together with the
 * `@Expose()` decorators of `averageInvestment` and
 * `averageInvestmentWithCurrencyEffect`
 */
function transformToBigWithFallback(formerKey: string) {
  return ({ obj, value }: { obj: Record<string, string>; value: string }) => {
    const valueOrFallback = value ?? obj[formerKey];

    return valueOrFallback === undefined
      ? undefined
      : transformToBig({ value: valueOrFallback });
  };
}

export class PortfolioSnapshotHolding {
  activitiesCount: number;

  @Expose()
  @Transform(transformToBigWithFallback('timeWeightedInvestment'), {
    toClassOnly: true
  })
  @Type(() => Big)
  averageInvestment: Big;

  @Expose()
  @Transform(
    transformToBigWithFallback('timeWeightedInvestmentWithCurrencyEffect'),
    { toClassOnly: true }
  )
  @Type(() => Big)
  averageInvestmentWithCurrencyEffect: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  averagePrice: Big;

  currency: string;
  dataSource: DataSource;
  dateOfFirstActivity: string;

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

  @Transform(transformToMapOfBig, { toClassOnly: true })
  netPerformancePercentageWithCurrencyEffectMap: { [key: DateRange]: Big };

  @Transform(transformToMapOfBig, { toClassOnly: true })
  netPerformanceWithCurrencyEffectMap: { [key: DateRange]: Big };

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  quantity: Big;

  symbol: string;
  tags?: Tag[];

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  valueInBaseCurrency: Big;
}
