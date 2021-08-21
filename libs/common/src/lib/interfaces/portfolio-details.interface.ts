import { PortfolioPosition } from '@ghostfolio/common/interfaces';

export interface PortfolioDetails {
  accounts: {
    [name: string]: { current: number; original: number };
  };
  holdings: { [symbol: string]: PortfolioPosition };
}
