import { Market, MarketAdvanced } from '@ghostfolio/common/types';

import { AssetClass, AssetSubClass, DataSource, Tag } from '@prisma/client';

import { Country } from './country.interface';
import { EnhancedSymbolProfile } from './enhanced-symbol-profile.interface';
import { Holding } from './holding.interface';
import { Sector } from './sector.interface';

export interface PortfolioPosition {
  activitiesCount: number;
  allocationInPercentage: number;

  /** @deprecated */
  assetClass?: AssetClass;

  /** @deprecated */
  assetClassLabel?: string;

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

  /** @deprecated */
  assetSubClass?: AssetSubClass;

  /** @deprecated */
  assetSubClassLabel?: string;

  /** @deprecated */
  countries: Country[];

  /** @deprecated */
  currency: string;

  /** @deprecated */
  dataSource: DataSource;

  dateOfFirstActivity: Date;
  dividend: number;
  exchange?: string;
  grossPerformance: number;
  grossPerformancePercent: number;
  grossPerformancePercentWithCurrencyEffect: number;
  grossPerformanceWithCurrencyEffect: number;

  /** @deprecated */
  holdings: Holding[];

  investment: number;
  marketChange?: number;
  marketChangePercent?: number;
  marketPrice: number;
  markets?: { [key in Market]: number };
  marketsAdvanced?: { [key in MarketAdvanced]: number };

  /** @deprecated */
  name: string;

  netPerformance: number;
  netPerformancePercent: number;
  netPerformancePercentWithCurrencyEffect: number;
  netPerformanceWithCurrencyEffect: number;
  quantity: number;

  /** @deprecated */
  sectors: Sector[];

  /** @deprecated */
  symbol: string;

  tags?: Tag[];
  type?: string;

  /** @deprecated */
  url?: string;

  valueInBaseCurrency?: number;
  valueInPercentage?: number;
}
