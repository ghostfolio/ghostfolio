import { GfPortfolioPerformanceModule } from '@ghostfolio/client/components/portfolio-performance/portfolio-performance.module';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';
import { GfNoTransactionsInfoComponent } from '@ghostfolio/ui/no-transactions-info';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { HomeOverviewComponent } from './home-overview.component';

@NgModule({
  declarations: [HomeOverviewComponent],
  imports: [
    CommonModule,
    GfLineChartComponent,
    GfNoTransactionsInfoComponent,
    GfPortfolioPerformanceModule,
    MatButtonModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHomeOverviewModule {}
