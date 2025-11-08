import { SymbolItem } from '@ghostfolio/common/interfaces/symbol-item.interface';

export interface MarketDataOfMarketsResponse {
  fearAndGreedIndex: {
    CRYPTOCURRENCIES: SymbolItem;
    STOCKS: SymbolItem;
  };
}
