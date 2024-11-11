import { GfFireCalculatorComponent } from '@ghostfolio/ui/fire-calculator';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { FirePageRoutingModule } from './fire-page-routing.module';
import { FirePageComponent } from './fire-page.component';

@NgModule({
  declarations: [FirePageComponent],
  imports: [
    CommonModule,
    FirePageRoutingModule,
    GfFireCalculatorComponent,
    GfPremiumIndicatorComponent,
    GfValueComponent,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FirePageModule {}
