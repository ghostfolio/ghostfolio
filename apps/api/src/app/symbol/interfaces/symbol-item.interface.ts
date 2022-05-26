import { HistoricalDataItem, UniqueAsset } from '@ghostfolio/common/interfaces';

export interface SymbolItem extends UniqueAsset {
  currency: string;
  historicalData: HistoricalDataItem[];
  marketPrice: number;
}
