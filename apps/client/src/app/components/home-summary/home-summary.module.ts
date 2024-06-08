import { GfPortfolioSummaryModule } from '@ghostfolio/client/components/portfolio-summary/portfolio-summary.module';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { HomeSummaryComponent } from './home-summary.component';

@NgModule({
  declarations: [HomeSummaryComponent],
  imports: [CommonModule, GfPortfolioSummaryModule, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHomeSummaryModule {}
