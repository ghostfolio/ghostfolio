import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { PricingPageRoutingModule } from './pricing-page-routing.module';
import { PricingPageComponent } from './pricing-page.component';

@NgModule({
  declarations: [PricingPageComponent],
  exports: [],
  imports: [CommonModule, MatCardModule, PricingPageRoutingModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PricingPageModule {}
