import { SymbolItem } from '@ghostfolio/api/app/symbol/interfaces/symbol-item.interface';

export interface MarketDataOfMarketsResponse {
  CRYPTOCURRENCIES: SymbolItem;
  STOCKS: SymbolItem;
}
