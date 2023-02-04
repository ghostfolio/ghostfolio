import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';

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
