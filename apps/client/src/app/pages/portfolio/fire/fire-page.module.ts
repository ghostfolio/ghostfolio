import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { GfFireCalculatorModule } from '@ghostfolio/ui/fire-calculator';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { FirePageRoutingModule } from './fire-page-routing.module';
import { FirePageComponent } from './fire-page.component';

@NgModule({
  declarations: [FirePageComponent],
  imports: [
    CommonModule,
    FirePageRoutingModule,
    GfFireCalculatorModule,
    GfValueModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FirePageModule {}
