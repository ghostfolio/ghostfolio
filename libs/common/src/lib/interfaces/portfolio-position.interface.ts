import { Market, MarketAdvanced } from '@ghostfolio/common/types';

import { Tag } from '@prisma/client';

import { EnhancedSymbolProfile } from './enhanced-symbol-profile.interface';

export interface PortfolioPosition {
  activitiesCount: number;
  allocationInPercentage: number;

  assetProfile: Pick<
    EnhancedSymbolProfile,
    | 'assetClass'
    | 'assetSubClass'
    | 'countries'
    | 'currency'
    | 'dataSource'
    | 'holdings'
    | 'name'
    | 'sectors'
    | 'symbol'
    | 'url'
  > & {
    assetClassLabel?: string;
    assetSubClassLabel?: string;
  };

  dateOfFirstActivity: Date;
  dividend: number;
  exchange?: string;
  grossPerformance: number;
  grossPerformancePercent: number;
  grossPerformancePercentWithCurrencyEffect: number;
  grossPerformanceWithCurrencyEffect: number;
  investment: number;
  marketChange?: number;
  marketChangePercent?: number;
  marketPrice: number;
  markets?: { [key in Market]: number };
  marketsAdvanced?: { [key in MarketAdvanced]: number };
  netPerformance: number;
  netPerformancePercent: number;
  netPerformancePercentWithCurrencyEffect: number;
  netPerformanceWithCurrencyEffect: number;
  quantity: number;
  tags?: Tag[];
  type?: string;
  valueInBaseCurrency?: number;
  valueInPercentage?: number;
}
