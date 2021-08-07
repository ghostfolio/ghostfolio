import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { PortfolioProportionChartModule } from '@ghostfolio/client/components/portfolio-proportion-chart/portfolio-proportion-chart.module';
import { GfPositionsTableModule } from '@ghostfolio/client/components/positions-table/positions-table.module';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';
import { GfWorldMapChartModule } from '@ghostfolio/client/components/world-map-chart/world-map-chart.module';

import { AllocationsPageRoutingModule } from './allocations-page-routing.module';
import { AllocationsPageComponent } from './allocations-page.component';

@NgModule({
  declarations: [AllocationsPageComponent],
  exports: [],
  imports: [
    AllocationsPageRoutingModule,
    CommonModule,
    GfPositionsTableModule,
    GfToggleModule,
    GfWorldMapChartModule,
    MatCardModule,
    PortfolioProportionChartModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AllocationsPageModule {}
