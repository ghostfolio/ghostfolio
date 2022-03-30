import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { FirePageRoutingModule } from './fire-page-routing.module';
import { FirePageComponent } from './fire-page.component';

@NgModule({
  declarations: [FirePageComponent],
  imports: [
    CommonModule,
    FirePageRoutingModule,
    GfValueModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FirePageModule {}
