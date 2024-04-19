import { GfWorldMapChartModule } from '@ghostfolio/client/components/world-map-chart/world-map-chart.module';
import { GfCarouselComponent } from '@ghostfolio/ui/carousel';
import { GfLogoComponent } from '@ghostfolio/ui/logo';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

import { LandingPageRoutingModule } from './landing-page-routing.module';
import { LandingPageComponent } from './landing-page.component';

@NgModule({
  declarations: [LandingPageComponent],
  imports: [
    CommonModule,
    GfCarouselComponent,
    GfLogoComponent,
    GfValueComponent,
    GfWorldMapChartModule,
    LandingPageRoutingModule,
    MatButtonModule,
    MatCardModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LandingPageModule {}
