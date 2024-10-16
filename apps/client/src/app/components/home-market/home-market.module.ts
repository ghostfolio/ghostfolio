import { GfFearAndGreedIndexModule } from '@ghostfolio/client/components/fear-and-greed-index/fear-and-greed-index.module';
import { GfBenchmarkComponent } from '@ghostfolio/ui/benchmark';
import { GfLineChartComponent } from '@ghostfolio/ui/line-chart';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { HomeMarketComponent } from './home-market.component';

@NgModule({
  declarations: [HomeMarketComponent],
  exports: [HomeMarketComponent],
  imports: [
    CommonModule,
    GfBenchmarkComponent,
    GfFearAndGreedIndexModule,
    GfLineChartComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHomeMarketModule {}
