import { User } from '@ghostfolio/common/interfaces';

import { DataSource } from '@prisma/client';

export interface HistoricalMarketDataEditorDialogParams {
  currency: string;
  dataSource: DataSource;
  dateString: string;
  marketPrice: number;
  symbol: string;
  user: User;
}
