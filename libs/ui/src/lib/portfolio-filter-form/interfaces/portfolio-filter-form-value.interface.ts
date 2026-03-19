import { PortfolioPosition } from '@ghostfolio/common/interfaces';

export interface PortfolioFilterFormValue {
  account: string | null;
  assetClass: string | null;
  holding: PortfolioPosition | null;
  tag: string | null;
}
