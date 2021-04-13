import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { LineChartComponent } from './line-chart.component';

@NgModule({
  declarations: [LineChartComponent],
  exports: [LineChartComponent],
  imports: [CommonModule, NgxSkeletonLoaderModule],
  providers: []
})
export class GfLineChartModule {}
