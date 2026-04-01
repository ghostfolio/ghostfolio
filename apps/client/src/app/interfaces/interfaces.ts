import type { Params } from '@angular/router';
import type { DataSource } from '@prisma/client';

export interface GfAppQueryParams extends Params {
  dataSource?: DataSource;
  holdingDetailDialog?: string;
  symbol?: string;
}
