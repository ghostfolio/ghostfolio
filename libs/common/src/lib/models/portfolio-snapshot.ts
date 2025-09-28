import { Big } from 'big.js';
import { Transform, Type } from 'class-transformer';

import { transformToBig } from '../class-transformer';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '../interfaces/index';
import { TimelinePosition } from './index';

export class PortfolioSnapshot {
  activitiesCount: number;

  createdAt: Date;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  currentValueInBaseCurrency: Big;

  errors: AssetProfileIdentifier[];

  hasErrors: boolean;

  historicalData: HistoricalDataItem[];

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
}
