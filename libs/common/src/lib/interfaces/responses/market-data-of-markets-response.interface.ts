import { SymbolItem } from '@ghostfolio/common/interfaces';

export interface MarketDataOfMarketsResponse {
  fearAndGreedIndex: {
    CRYPTOCURRENCIES: SymbolItem;
    STOCKS: SymbolItem;
  };
}
