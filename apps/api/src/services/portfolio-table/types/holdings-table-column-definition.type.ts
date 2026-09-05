import { TableColumnDefinition } from '@ghostfolio/api/helper/interfaces/table-column-definition.interface';
import { PortfolioPosition } from '@ghostfolio/common/interfaces';

import { HoldingsTableContext } from '../interfaces/holdings-table-context.interface';

export type HoldingsTableColumnDefinition = TableColumnDefinition<
  PortfolioPosition,
  HoldingsTableContext
>;
