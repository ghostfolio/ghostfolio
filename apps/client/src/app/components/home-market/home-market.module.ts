import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { GfFearAndGreedIndexModule } from '@ghostfolio/client/components/fear-and-greed-index/fear-and-greed-index.module';
import { GfLineChartModule } from '@ghostfolio/ui/line-chart/line-chart.module';

import { HomeMarketComponent } from './home-market.component';

@NgModule({
  declarations: [HomeMarketComponent],
  exports: [],
  imports: [CommonModule, GfFearAndGreedIndexModule, GfLineChartModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHomeMarketModule {}
