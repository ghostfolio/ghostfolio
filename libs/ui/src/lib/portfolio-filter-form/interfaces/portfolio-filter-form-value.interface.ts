import { PortfolioPosition } from '@ghostfolio/common/interfaces';

export interface PortfolioFilterFormValue {
  account: string;
  assetClass: string;
  holding: PortfolioPosition;
  tag: string;
}
