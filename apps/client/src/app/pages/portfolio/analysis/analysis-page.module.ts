import { GfBenchmarkComparatorModule } from '@ghostfolio/client/components/benchmark-comparator/benchmark-comparator.module';
import { GfInvestmentChartModule } from '@ghostfolio/client/components/investment-chart/investment-chart.module';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';
import { GfActivitiesFilterModule } from '@ghostfolio/ui/activities-filter/activities-filter.module';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';
import { GfValueModule } from '@ghostfolio/ui/value';

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
    GfActivitiesFilterModule,
    GfBenchmarkComparatorModule,
    GfInvestmentChartModule,
    GfPremiumIndicatorModule,
    GfToggleModule,
    GfValueModule,
    MatCardModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AnalysisPageModule {}
