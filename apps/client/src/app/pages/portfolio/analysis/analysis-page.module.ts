import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { GfInvestmentChartModule } from '@ghostfolio/client/components/investment-chart/investment-chart.module';

import { AnalysisPageRoutingModule } from './analysis-page-routing.module';
import { AnalysisPageComponent } from './analysis-page.component';

@NgModule({
  declarations: [AnalysisPageComponent],
  exports: [],
  imports: [
    AnalysisPageRoutingModule,
    CommonModule,
    GfInvestmentChartModule,
    MatCardModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AnalysisPageModule {}
