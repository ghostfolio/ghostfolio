import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { WorldMapChartComponent } from './world-map-chart.component';

@NgModule({
  declarations: [WorldMapChartComponent],
  exports: [WorldMapChartComponent],
  imports: [CommonModule, NgxSkeletonLoaderModule],
  providers: []
})
export class GfWorldMapChartModule {}
