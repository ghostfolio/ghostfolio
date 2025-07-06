import { GfRulesModule } from '@ghostfolio/client/components/rules/rules.module';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { XRayPageRoutingModule } from './x-ray-page-routing.module';
import { XRayPageComponent } from './x-ray-page.component';

@NgModule({
  declarations: [XRayPageComponent],
  imports: [
    CommonModule,
    GfPremiumIndicatorComponent,
    GfRulesModule,
    IonIcon,
    NgxSkeletonLoaderModule,
    XRayPageRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class XRayPageModule {}
