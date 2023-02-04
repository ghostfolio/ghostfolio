import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { RouterModule } from '@angular/router';
import { GfPortfolioSummaryModule } from '@ghostfolio/client/components/portfolio-summary/portfolio-summary.module';

import { HomeSummaryComponent } from './home-summary.component';

@NgModule({
  declarations: [HomeSummaryComponent],
  imports: [
    CommonModule,
    GfPortfolioSummaryModule,
    MatCardModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHomeSummaryModule {}
