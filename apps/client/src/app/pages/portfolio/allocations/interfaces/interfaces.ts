import { Params } from '@angular/router';

export interface AllocationsPageParams extends Params {
  accountDetailDialog?: string;
  accountId?: string;
}
