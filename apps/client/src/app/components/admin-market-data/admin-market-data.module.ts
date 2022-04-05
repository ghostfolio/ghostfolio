import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { GfAdminMarketDataDetailModule } from '@ghostfolio/client/components/admin-market-data-detail/admin-market-data-detail.module';

import { AdminMarketDataComponent } from './admin-market-data.component';

@NgModule({
  declarations: [AdminMarketDataComponent],
  imports: [
    CommonModule,
    GfAdminMarketDataDetailModule,
    MatButtonModule,
    MatMenuModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminMarketDataModule {}
