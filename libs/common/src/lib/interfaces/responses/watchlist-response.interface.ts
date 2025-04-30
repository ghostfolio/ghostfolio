import {
  AssetProfileIdentifier,
  Benchmark
} from '@ghostfolio/common/interfaces';

export interface WatchlistResponse {
  watchlist: (AssetProfileIdentifier & {
    performances: Benchmark['performances'];
  })[];
}
