import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { PortfolioProportionChartComponent } from './portfolio-proportion-chart.component';

@NgModule({
  declarations: [PortfolioProportionChartComponent],
  exports: [PortfolioProportionChartComponent],
  imports: [CommonModule, NgxSkeletonLoaderModule],
  providers: []
})
export class GfPortfolioProportionChartModule {}
