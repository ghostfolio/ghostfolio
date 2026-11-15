import { PortfolioPosition } from '@ghostfolio/common/interfaces';

export interface PortfolioFilterFormValue {
  accounts: string[];
  assetClasses: string[];
  holding: PortfolioPosition | null;
  tags: string[];
}
