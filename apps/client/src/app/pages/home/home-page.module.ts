import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

import { GfLineChartModule } from '../../components/line-chart/line-chart.module';
import { GfPerformanceChartDialogModule } from '../../components/performance-chart-dialog/performance-chart-dialog.module';
import { GfPortfolioOverviewModule } from '../../components/portfolio-overview/portfolio-overview.module';
import { GfPortfolioPerformanceSummaryModule } from '../../components/portfolio-performance-summary/portfolio-performance-summary.module';
import { GfPortfolioPerformanceModule } from '../../components/portfolio-performance/portfolio-performance.module';
import { GfPositionsModule } from '../../components/positions/positions.module';
import { GfToggleModule } from '../../components/toggle/toggle.module';
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
