import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';

import { PricingPageRoutingModule } from './pricing-page-routing.module';
import { PricingPageComponent } from './pricing-page.component';

@NgModule({
  declarations: [PricingPageComponent],
  imports: [
    CommonModule,
    GfPremiumIndicatorModule,
    MatButtonModule,
    MatCardModule,
    PricingPageRoutingModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PricingPageModule {}
