import { transformToBig } from '@ghostfolio/common/class-transformer';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { TimelinePosition } from '@ghostfolio/common/models';

import { Big } from 'big.js';
import { Transform, Type } from 'class-transformer';

export class PortfolioSnapshot {
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

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  totalValuablesWithCurrencyEffect: Big;
}
