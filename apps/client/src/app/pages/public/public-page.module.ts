import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { GfPortfolioProportionChartModule } from '@ghostfolio/ui/portfolio-proportion-chart/portfolio-proportion-chart.module';

import { PublicPageRoutingModule } from './public-page-routing.module';
import { PublicPageComponent } from './public-page.component';

@NgModule({
  declarations: [PublicPageComponent],
  exports: [],
  imports: [
    CommonModule,
    GfPortfolioProportionChartModule,
    MatButtonModule,
    MatCardModule,
    PublicPageRoutingModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PublicPageModule {}
