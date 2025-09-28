import { AssetProfileIdentifier, Benchmark } from '../index';

export interface WatchlistResponse {
  watchlist: (AssetProfileIdentifier & {
    marketCondition: Benchmark['marketCondition'];
    name: string;
    performances: Benchmark['performances'];
    trend50d: Benchmark['trend50d'];
    trend200d: Benchmark['trend200d'];
  })[];
}
