import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { GfLineChartModule } from '@ghostfolio/client/app/components/line-chart/line-chart.module';
import { GfPerformanceChartDialogModule } from '@ghostfolio/client/app/components/performance-chart-dialog/performance-chart-dialog.module';
import { GfPortfolioOverviewModule } from '@ghostfolio/client/app/components/portfolio-overview/portfolio-overview.module';
import { GfPortfolioPerformanceSummaryModule } from '@ghostfolio/client/app/components/portfolio-performance-summary/portfolio-performance-summary.module';
import { GfPortfolioPerformanceModule } from '@ghostfolio/client/app/components/portfolio-performance/portfolio-performance.module';
import { GfPositionsModule } from '@ghostfolio/client/app/components/positions/positions.module';
import { GfToggleModule } from '@ghostfolio/client/app/components/toggle/toggle.module';

import { HomePageRoutingModule } from './home-page-routing.module';
import { HomePageComponent } from './home-page.component';

@NgModule({
  declarations: [HomePageComponent],
  exports: [],
  imports: [
    CommonModule,
    GfLineChartModule,
    GfPerformanceChartDialogModule,
    GfPortfolioOverviewModule,
    GfPortfolioPerformanceModule,
    GfPortfolioPerformanceSummaryModule,
    GfPositionsModule,
    GfToggleModule,
    HomePageRoutingModule,
    MatButtonModule,
    MatCardModule,
    RouterModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePageModule {}
