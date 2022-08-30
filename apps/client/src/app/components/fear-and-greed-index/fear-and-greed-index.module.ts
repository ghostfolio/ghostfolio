import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { FearAndGreedIndexComponent } from './fear-and-greed-index.component';

@NgModule({
  declarations: [FearAndGreedIndexComponent],
  exports: [FearAndGreedIndexComponent],
  imports: [CommonModule, NgxSkeletonLoaderModule]
})
export class GfFearAndGreedIndexModule {}
