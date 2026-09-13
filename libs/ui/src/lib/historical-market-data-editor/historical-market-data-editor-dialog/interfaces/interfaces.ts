import { User } from '@ghostfolio/common/interfaces';
import type { DataSource } from '@ghostfolio/prisma/enums';

export interface HistoricalMarketDataEditorDialogParams {
  currency: string;
  dataSource: DataSource;
  dateString: string;
  marketPrice?: number;
  symbol: string;
  user: User;
}
