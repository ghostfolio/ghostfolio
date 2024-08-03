import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';

export interface SymbolItem extends AssetProfileIdentifier {
  currency: string;
  historicalData: HistoricalDataItem[];
  marketPrice: number;
}
