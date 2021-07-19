import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { GfLineChartModule } from '@ghostfolio/client/components/line-chart/line-chart.module';
import { GfNoTransactionsInfoModule } from '@ghostfolio/client/components/no-transactions-info/no-transactions-info.module';
import { GfPortfolioPerformanceSummaryModule } from '@ghostfolio/client/components/portfolio-performance-summary/portfolio-performance-summary.module';
import { GfPositionsModule } from '@ghostfolio/client/components/positions/positions.module';

import { ZenPageRoutingModule } from './zen-page-routing.module';
import { ZenPageComponent } from './zen-page.component';

@NgModule({
  declarations: [ZenPageComponent],
  exports: [],
  imports: [
    CommonModule,
    GfLineChartModule,
    GfNoTransactionsInfoModule,
    GfPortfolioPerformanceSummaryModule,
    GfPositionsModule,
    MatButtonModule,
    MatCardModule,
    RouterModule,
    ZenPageRoutingModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ZenPageModule {}
