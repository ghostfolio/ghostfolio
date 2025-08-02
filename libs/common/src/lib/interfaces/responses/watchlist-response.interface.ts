import {
  AssetProfileIdentifier,
  Benchmark
} from '@ghostfolio/common/interfaces';

export interface WatchlistResponse {
  watchlist: (AssetProfileIdentifier & {
    marketCondition: Benchmark['marketCondition'];
    name: string;
    performances: Benchmark['performances'];
  })[];
}
