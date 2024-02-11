import { GfLineChartModule } from '@ghostfolio/ui/line-chart/line-chart.module';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { AdminMarketDataDetailComponent } from './admin-market-data-detail.component';
import { GfMarketDataDetailDialogModule } from './market-data-detail-dialog/market-data-detail-dialog.module';

@NgModule({
  declarations: [AdminMarketDataDetailComponent],
  exports: [AdminMarketDataDetailComponent],
  imports: [CommonModule, GfLineChartModule, GfMarketDataDetailDialogModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminMarketDataDetailModule {}
