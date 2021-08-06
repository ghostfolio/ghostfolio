import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { GfInvestmentChartModule } from '@ghostfolio/client/components/investment-chart/investment-chart.module';
import { PortfolioProportionChartModule } from '@ghostfolio/client/components/portfolio-proportion-chart/portfolio-proportion-chart.module';
import { GfPositionsTableModule } from '@ghostfolio/client/components/positions-table/positions-table.module';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';
import { GfWorldMapChartModule } from '@ghostfolio/client/components/world-map-chart/world-map-chart.module';

import { AnalysisPageRoutingModule } from './analysis-page-routing.module';
import { AnalysisPageComponent } from './analysis-page.component';

@NgModule({
  declarations: [AnalysisPageComponent],
  exports: [],
  imports: [
    AnalysisPageRoutingModule,
    CommonModule,
    GfInvestmentChartModule,
    GfPositionsTableModule,
    GfToggleModule,
    GfWorldMapChartModule,
    MatCardModule,
    PortfolioProportionChartModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AnalysisPageModule {}
