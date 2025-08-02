import {
  AssetProfileIdentifier,
  DataProviderInfo
} from '@ghostfolio/common/interfaces';
import { MarketState } from '@ghostfolio/common/types';

import { DataSource } from '@prisma/client';

export interface IDataProviderHistoricalResponse {
  marketPrice: number;
}

export interface IDataProviderResponse {
  currency: string;
  dataProviderInfo?: DataProviderInfo;
  dataSource: DataSource;
  marketPrice: number;
  marketState: MarketState;
}

export interface IDataGatheringItem extends AssetProfileIdentifier {
  date?: Date;
}
