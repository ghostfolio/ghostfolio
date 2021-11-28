import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { AdminMarketDataDetailComponent } from './admin-market-data-detail.component';

@NgModule({
  declarations: [AdminMarketDataDetailComponent],
  exports: [AdminMarketDataDetailComponent],
  imports: [CommonModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminMarketDataDetailModule {}
