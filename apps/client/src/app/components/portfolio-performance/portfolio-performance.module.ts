import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { GfValueModule } from '../value/value.module';
import { PortfolioPerformanceComponent } from './portfolio-performance.component';

@NgModule({
  declarations: [PortfolioPerformanceComponent],
  exports: [PortfolioPerformanceComponent],
  imports: [CommonModule, GfValueModule],
  providers: []
})
export class GfPortfolioPerformanceModule {}
