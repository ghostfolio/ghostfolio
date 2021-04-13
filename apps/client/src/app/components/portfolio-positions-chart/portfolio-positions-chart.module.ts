import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { PortfolioPositionsChartComponent } from './portfolio-positions-chart.component';

@NgModule({
  declarations: [PortfolioPositionsChartComponent],
  exports: [PortfolioPositionsChartComponent],
  imports: [CommonModule, NgxSkeletonLoaderModule],
  providers: []
})
export class PortfolioPositionsChartModule {}
