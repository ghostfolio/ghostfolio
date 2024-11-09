import { GfRulesModule } from '@ghostfolio/client/components/rules/rules.module';
import { GfFireCalculatorComponent } from '@ghostfolio/ui/fire-calculator';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { XRayComponent } from './x-ray.component';

@NgModule({
  declarations: [XRayComponent],
  imports: [
    CommonModule,
    GfFireCalculatorComponent,
    GfPremiumIndicatorComponent,
    GfRulesModule,
    GfValueComponent,
    NgxSkeletonLoaderModule,
    RouterModule.forChild([{ path: '', component: XRayComponent }])
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class XRayModule {}
