import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { PortfolioPerformanceComponent } from './portfolio-performance.component';

@NgModule({
  declarations: [PortfolioPerformanceComponent],
  exports: [PortfolioPerformanceComponent],
  imports: [CommonModule, GfValueModule, NgxSkeletonLoaderModule]
})
export class GfPortfolioPerformanceModule {}
