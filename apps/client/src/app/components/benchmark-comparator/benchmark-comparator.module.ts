import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { BenchmarkComparatorComponent } from './benchmark-comparator.component';

@NgModule({
  declarations: [BenchmarkComparatorComponent],
  exports: [BenchmarkComparatorComponent],
  imports: [
    CommonModule,
    FormsModule,
    GfPremiumIndicatorModule,
    MatSelectModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule
  ]
})
export class GfBenchmarkComparatorModule {}
