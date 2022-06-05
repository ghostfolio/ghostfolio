import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfValueModule } from '../value';
import { BenchmarkComponent } from './benchmark.component';

@NgModule({
  declarations: [BenchmarkComponent],
  exports: [BenchmarkComponent],
  imports: [CommonModule, GfValueModule, NgxSkeletonLoaderModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfBenchmarkModule {}
