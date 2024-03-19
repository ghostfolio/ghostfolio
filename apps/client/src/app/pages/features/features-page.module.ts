import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { FeaturesPageRoutingModule } from './features-page-routing.module';
import { FeaturesPageComponent } from './features-page.component';

@NgModule({
  declarations: [FeaturesPageComponent],
  imports: [
    CommonModule,
    FeaturesPageRoutingModule,
    GfPremiumIndicatorModule,
    MatButtonModule,
    MatCardModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FeaturesPageModule {}
