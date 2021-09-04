import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { GfValueModule } from '@ghostfolio/ui/value';

import { PortfolioSummaryComponent } from './portfolio-summary.component';

@NgModule({
  declarations: [PortfolioSummaryComponent],
  exports: [PortfolioSummaryComponent],
  imports: [CommonModule, GfValueModule],
  providers: []
})
export class GfPortfolioSummaryModule {}
