import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { BenchmarkComparatorComponent } from './benchmark-comparator.component';

@NgModule({
  declarations: [BenchmarkComparatorComponent],
  exports: [BenchmarkComparatorComponent],
  imports: [
    CommonModule,
    FormsModule,
    GfToggleModule,
    MatSelectModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule
  ]
})
export class GfBenchmarkComparatorModule {}
