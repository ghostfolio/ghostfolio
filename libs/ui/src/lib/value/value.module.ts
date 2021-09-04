import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { ValueComponent } from './value.component';

@NgModule({
  declarations: [ValueComponent],
  exports: [ValueComponent],
  imports: [CommonModule, NgxSkeletonLoaderModule],
  providers: []
})
export class GfValueModule {}
