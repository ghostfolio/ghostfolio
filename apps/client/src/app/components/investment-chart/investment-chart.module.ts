import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { InvestmentChartComponent } from './investment-chart.component';

@NgModule({
  declarations: [InvestmentChartComponent],
  exports: [InvestmentChartComponent],
  imports: [CommonModule, NgxSkeletonLoaderModule]
})
export class GfInvestmentChartModule {}
