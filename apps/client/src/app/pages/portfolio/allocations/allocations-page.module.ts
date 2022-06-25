import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';
import { GfWorldMapChartModule } from '@ghostfolio/client/components/world-map-chart/world-map-chart.module';
import { GfActivitiesFilterModule } from '@ghostfolio/ui/activities-filter/activities-filter.module';
import { GfPortfolioProportionChartModule } from '@ghostfolio/ui/portfolio-proportion-chart/portfolio-proportion-chart.module';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';
import { GfValueModule } from '@ghostfolio/ui/value';

import { AllocationsPageRoutingModule } from './allocations-page-routing.module';
import { AllocationsPageComponent } from './allocations-page.component';

@NgModule({
  declarations: [AllocationsPageComponent],
  imports: [
    AllocationsPageRoutingModule,
    CommonModule,
    GfActivitiesFilterModule,
    GfPortfolioProportionChartModule,
    GfPremiumIndicatorModule,
    GfToggleModule,
    GfWorldMapChartModule,
    GfValueModule,
    MatCardModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AllocationsPageModule {}
