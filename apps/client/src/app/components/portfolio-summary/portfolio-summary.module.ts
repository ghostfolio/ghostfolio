import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PortfolioSummaryComponent } from './portfolio-summary.component';

@NgModule({
  declarations: [PortfolioSummaryComponent],
  exports: [PortfolioSummaryComponent],
  imports: [CommonModule, GfValueComponent, MatTooltipModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPortfolioSummaryModule {}
