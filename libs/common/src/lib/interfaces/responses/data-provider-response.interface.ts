import { DataProviderInfo } from '@ghostfolio/common/interfaces';
import { MarketState } from '@ghostfolio/common/types';
import type { DataSource } from '@ghostfolio/prisma/enums';

export interface DataProviderHistoricalResponse {
  marketPrice: number;
}

export interface DataProviderResponse {
  currency: string;
  dataProviderInfo?: DataProviderInfo;
  dataSource: DataSource;
  marketPrice: number;
  marketState: MarketState;
}
