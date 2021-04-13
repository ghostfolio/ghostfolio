import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { GfValueModule } from '../value/value.module';
import { PortfolioOverviewComponent } from './portfolio-overview.component';

@NgModule({
  declarations: [PortfolioOverviewComponent],
  exports: [PortfolioOverviewComponent],
  imports: [CommonModule, GfValueModule],
  providers: []
})
export class GfPortfolioOverviewModule {}
