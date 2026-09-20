import { transformToBig } from '@ghostfolio/common/class-transformer';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshotHolding } from '@ghostfolio/common/models';

import { Big } from 'big.js';
import { Transform, Type } from 'class-transformer';

export class PortfolioSnapshot {
  activitiesCount: number;

  createdAt: Date;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  currentValueInBaseCurrency: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  dividendYieldPercent: Big;

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  dividendYieldPercentWithCurrencyEffect: Big;

  errors: AssetProfileIdentifier[];

  hasErrors: boolean;

  historicalData: HistoricalDataItem[];

  @Type(() => PortfolioSnapshotHolding)
  positions: PortfolioSnapshotHolding[];

  @Transform(transformToBig, { toClassOnly: true })
  @Type(() => Big)
  totalCashInBaseCurrency: Big;

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
