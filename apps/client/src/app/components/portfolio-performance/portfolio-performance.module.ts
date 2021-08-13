import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfValueModule } from '../value/value.module';
import { PortfolioPerformanceComponent } from './portfolio-performance.component';

@NgModule({
  declarations: [PortfolioPerformanceComponent],
  exports: [PortfolioPerformanceComponent],
  imports: [CommonModule, GfValueModule, NgxSkeletonLoaderModule],
  providers: []
})
export class GfPortfolioPerformanceModule {}
