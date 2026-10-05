import type { TableColumnDefinition } from '@ghostfolio/api/helper/interfaces/table-column-definition.interface';
import type { PortfolioPosition } from '@ghostfolio/common/interfaces';

import type { HoldingsTableContext } from '../interfaces/holdings-table-context.interface';

export type HoldingsTableColumnDefinition = TableColumnDefinition<
  PortfolioPosition,
  HoldingsTableContext
>;
