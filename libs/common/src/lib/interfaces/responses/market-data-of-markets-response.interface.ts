import { SymbolItem } from '@ghostfolio/api/app/symbol/interfaces/symbol-item.interface';

export interface MarketDataOfMarketsResponse {
  fearAndGreedIndex: {
    CRYPTOCURRENCIES: SymbolItem;
    STOCKS: SymbolItem;
  };
}
