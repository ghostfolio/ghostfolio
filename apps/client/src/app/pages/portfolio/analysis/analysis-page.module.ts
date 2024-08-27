import { GfBenchmarkComparatorModule } from '@ghostfolio/client/components/benchmark-comparator/benchmark-comparator.module';
import { GfInvestmentChartModule } from '@ghostfolio/client/components/investment-chart/investment-chart.module';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';
import { GfActivitiesFilterComponent } from '@ghostfolio/ui/activities-filter';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AnalysisPageRoutingModule } from './analysis-page-routing.module';
import { AnalysisPageComponent } from './analysis-page.component';

@NgModule({
  declarations: [AnalysisPageComponent],
  imports: [
    AnalysisPageRoutingModule,
    CommonModule,
    GfActivitiesFilterComponent,
    GfBenchmarkComparatorModule,
    GfInvestmentChartModule,
    GfPremiumIndicatorComponent,
    GfToggleModule,
    GfValueComponent,
    MatCardModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AnalysisPageModule {}
