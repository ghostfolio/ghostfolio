import { WatchlistResponse } from '@ghostfolio/common/interfaces';

export interface WatchlistValue {
  expiration: number;
  watchlist: WatchlistResponse['watchlist'];
}
