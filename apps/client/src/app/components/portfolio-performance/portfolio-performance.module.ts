import { GfValueModule } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { PortfolioPerformanceComponent } from './portfolio-performance.component';

@NgModule({
  declarations: [PortfolioPerformanceComponent],
  exports: [PortfolioPerformanceComponent],
  imports: [CommonModule, GfValueModule, NgxSkeletonLoaderModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPortfolioPerformanceModule {}
