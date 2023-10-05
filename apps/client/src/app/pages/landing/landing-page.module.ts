import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { GfWorldMapChartModule } from '@ghostfolio/client/components/world-map-chart/world-map-chart.module';
import { GfLogoModule } from '@ghostfolio/ui/logo';
import { GfValueModule } from '@ghostfolio/ui/value';
import { CarouselItem } from '@ghostfolio/ui/carousel/carousel-item.directive';
import { Carousel } from '@ghostfolio/ui/carousel/carousel';

import { LandingPageRoutingModule } from './landing-page-routing.module';
import { LandingPageComponent } from './landing-page.component';

@NgModule({
  declarations: [Carousel, CarouselItem, LandingPageComponent],
  imports: [
    CommonModule,
    GfLogoModule,
    GfValueModule,
    GfWorldMapChartModule,
    LandingPageRoutingModule,
    MatButtonModule,
    MatCardModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LandingPageModule {}
