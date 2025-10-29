import {
  AssetProfileIdentifier,
  DataProviderInfo
} from '@ghostfolio/common/interfaces';
import { MarketState } from '@ghostfolio/common/types';

import { DataSource } from '@prisma/client';

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

export interface DataGatheringItem extends AssetProfileIdentifier {
  date?: Date;
  force?: boolean;
}
