import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { FearAndGreedIndexComponent } from './fear-and-greed-index.component';

@NgModule({
  declarations: [FearAndGreedIndexComponent],
  exports: [FearAndGreedIndexComponent],
  imports: [CommonModule]
})
export class GfFearAndGreedIndexModule {}
