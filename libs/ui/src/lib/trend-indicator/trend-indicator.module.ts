import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { TrendIndicatorComponent } from './trend-indicator.component';

@NgModule({
  declarations: [TrendIndicatorComponent],
  exports: [TrendIndicatorComponent],
  imports: [CommonModule, NgxSkeletonLoaderModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfTrendIndicatorModule {}
