import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
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
    ReactiveFormsModule,
    RouterModule
  ]
})
export class GfBenchmarkComparatorModule {}
