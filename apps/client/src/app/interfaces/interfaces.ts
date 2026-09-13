import type { DataSource } from '@ghostfolio/prisma/enums';

import type { Params } from '@angular/router';

export interface GfAppQueryParams extends Params {
  dataSource?: DataSource;
  holdingDetailDialog?: string;
  symbol?: string;
}
