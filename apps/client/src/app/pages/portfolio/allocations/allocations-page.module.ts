import { GfWorldMapChartModule } from '@ghostfolio/client/components/world-map-chart/world-map-chart.module';
import { GfPortfolioProportionChartModule } from '@ghostfolio/ui/portfolio-proportion-chart/portfolio-proportion-chart.module';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';
import { GfValueModule } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AllocationsPageRoutingModule } from './allocations-page-routing.module';
import { AllocationsPageComponent } from './allocations-page.component';

@NgModule({
  declarations: [AllocationsPageComponent],
  imports: [
    AllocationsPageRoutingModule,
    CommonModule,
    GfPortfolioProportionChartModule,
    GfPremiumIndicatorModule,
    GfWorldMapChartModule,
    GfValueModule,
    MatCardModule,
    MatDialogModule,
    MatProgressBarModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AllocationsPageModule {}
