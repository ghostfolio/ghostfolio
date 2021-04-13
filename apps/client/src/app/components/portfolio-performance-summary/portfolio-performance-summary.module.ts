import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfValueModule } from '../value/value.module';
import { PortfolioPerformanceSummaryComponent } from './portfolio-performance-summary.component';

@NgModule({
  declarations: [PortfolioPerformanceSummaryComponent],
  exports: [PortfolioPerformanceSummaryComponent],
  imports: [CommonModule, GfValueModule, NgxSkeletonLoaderModule],
  providers: []
})
export class GfPortfolioPerformanceSummaryModule {}
