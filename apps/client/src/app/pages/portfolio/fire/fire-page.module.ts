import { GfRulesModule } from '@ghostfolio/client/components/rules/rules.module';
import { GfFireCalculatorModule } from '@ghostfolio/ui/fire-calculator';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';
import { GfValueModule } from '@ghostfolio/ui/value';

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
    GfFireCalculatorModule,
    GfPremiumIndicatorModule,
    GfRulesModule,
    GfValueModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FirePageModule {}
