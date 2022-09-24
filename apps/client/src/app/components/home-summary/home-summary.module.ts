import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { GfPortfolioSummaryModule } from '@ghostfolio/client/components/portfolio-summary/portfolio-summary.module';
import { GfActivitiesFilterModule } from '@ghostfolio/ui/activities-filter/activities-filter.module';

import { HomeSummaryComponent } from './home-summary.component';

@NgModule({
  declarations: [HomeSummaryComponent],
  imports: [
    CommonModule,
    GfActivitiesFilterModule,
    GfPortfolioSummaryModule,
    MatCardModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHomeSummaryModule {}
