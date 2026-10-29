import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

export type PortfolioProportionChartClickEvent =
  | AssetProfileIdentifier
  | { accountId: string };
