import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { GfLineChartModule } from '@ghostfolio/client/components/line-chart/line-chart.module';
import { GfLogoModule } from '@ghostfolio/client/components/logo/logo.module';

import { LandingPageRoutingModule } from './landing-page-routing.module';
import { LandingPageComponent } from './landing-page.component';

@NgModule({
  declarations: [LandingPageComponent],
  exports: [],
  imports: [
    CommonModule,
    GfLineChartModule,
    GfLogoModule,
    LandingPageRoutingModule,
    MatButtonModule,
    RouterModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LandingPageModule {}
