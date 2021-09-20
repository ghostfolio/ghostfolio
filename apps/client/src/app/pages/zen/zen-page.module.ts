import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { GfPortfolioPerformanceModule } from '@ghostfolio/client/components/portfolio-performance/portfolio-performance.module';
import { GfPositionsModule } from '@ghostfolio/client/components/positions/positions.module';
import { GfLineChartModule } from '@ghostfolio/ui/line-chart/line-chart.module';
import { GfNoTransactionsInfoModule } from '@ghostfolio/ui/no-transactions-info';

import { ZenPageRoutingModule } from './zen-page-routing.module';
import { ZenPageComponent } from './zen-page.component';

@NgModule({
  declarations: [ZenPageComponent],
  exports: [],
  imports: [
    CommonModule,
    GfLineChartModule,
    GfNoTransactionsInfoModule,
    GfPortfolioPerformanceModule,
    GfPositionsModule,
    MatButtonModule,
    MatCardModule,
    MatTabsModule,
    RouterModule,
    ZenPageRoutingModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ZenPageModule {}
