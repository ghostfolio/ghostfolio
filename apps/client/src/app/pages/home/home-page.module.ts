import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { GfFearAndGreedIndexModule } from '@ghostfolio/client/components/fear-and-greed-index/fear-and-greed-index.module';
import { GfPerformanceChartDialogModule } from '@ghostfolio/client/components/performance-chart-dialog/performance-chart-dialog.module';
import { GfPortfolioPerformanceModule } from '@ghostfolio/client/components/portfolio-performance/portfolio-performance.module';
import { GfPortfolioSummaryModule } from '@ghostfolio/client/components/portfolio-summary/portfolio-summary.module';
import { GfPositionsModule } from '@ghostfolio/client/components/positions/positions.module';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';
import { GfLineChartModule } from '@ghostfolio/ui/line-chart/line-chart.module';
import { GfNoTransactionsInfoModule } from '@ghostfolio/ui/no-transactions-info';

import { HomePageRoutingModule } from './home-page-routing.module';
import { HomePageComponent } from './home-page.component';

@NgModule({
  declarations: [HomePageComponent],
  exports: [],
  imports: [
    CommonModule,
    GfFearAndGreedIndexModule,
    GfLineChartModule,
    GfNoTransactionsInfoModule,
    GfPerformanceChartDialogModule,
    GfPortfolioPerformanceModule,
    GfPortfolioSummaryModule,
    GfPositionsModule,
    GfToggleModule,
    HomePageRoutingModule,
    MatButtonModule,
    MatCardModule,
    MatTabsModule,
    RouterModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePageModule {}
