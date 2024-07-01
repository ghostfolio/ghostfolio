import { transformToBig } from '@ghostfolio/common/class-transformer';
import { HistoricalDataItem, UniqueAsset } from '@ghostfolio/common/interfaces';
import { TimelinePosition } from '@ghostfolio/common/models';

import { Big } from 'big.js';
import { Transform, Type } from 'class-transformer';

export class PortfolioSnapshot {
  chartData: HistoricalDataItem[];

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  currentValueInBaseCurrency: Big;

  errors?: UniqueAsset[];

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  grossPerformance: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  grossPerformanceWithCurrencyEffect: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  grossPerformancePercentage: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  grossPerformancePercentageWithCurrencyEffect: Big;

  hasErrors: boolean;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  netAnnualizedPerformance?: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  netAnnualizedPerformanceWithCurrencyEffect?: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  netPerformance: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  netPerformanceWithCurrencyEffect: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  netPerformancePercentage: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  netPerformancePercentageWithCurrencyEffect: Big;

  @Type(() => TimelinePosition)
  positions: TimelinePosition[];

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  totalFeesWithCurrencyEffect: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  totalInterestWithCurrencyEffect: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  totalInvestment: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  totalInvestmentWithCurrencyEffect: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  totalLiabilitiesWithCurrencyEffect: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  totalValuablesWithCurrencyEffect: Big;
}
