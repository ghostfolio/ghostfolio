import { PortfolioItem, Position } from '@ghostfolio/helper/interfaces';

import { Order } from '../order';

export interface PortfolioInterface {
  get(aDate?: Date): PortfolioItem[];

  getCommittedFunds(): number;

  getFees(): number;

  getPositions(
    aDate: Date
  ): {
    [symbol: string]: Position;
  };

  getSymbols(aDate?: Date): string[];

  getTotalBuy(): number;

  getTotalSell(): number;

  getOrders(): Order[];

  getValue(aDate?: Date): number;
}
