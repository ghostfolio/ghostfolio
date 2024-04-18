import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfTrendIndicatorComponent } from '../trend-indicator';
import { GfValueComponent } from '../value';
import { BenchmarkComponent } from './benchmark.component';

@NgModule({
  declarations: [BenchmarkComponent],
  exports: [BenchmarkComponent],
  imports: [
    CommonModule,
    GfTrendIndicatorComponent,
    GfValueComponent,
    MatTableModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfBenchmarkModule {}
