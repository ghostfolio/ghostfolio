import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { ValueComponent } from './value.component';

@NgModule({
  declarations: [ValueComponent],
  exports: [ValueComponent],
  imports: [CommonModule, NgxSkeletonLoaderModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfValueModule {}
