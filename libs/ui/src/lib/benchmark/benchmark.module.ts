import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfTrendIndicatorComponent } from '../trend-indicator';
import { GfValueModule } from '../value';
import { BenchmarkComponent } from './benchmark.component';

@NgModule({
  declarations: [BenchmarkComponent],
  exports: [BenchmarkComponent],
  imports: [
    CommonModule,
    GfTrendIndicatorComponent,
    GfValueModule,
    MatTableModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfBenchmarkModule {}
