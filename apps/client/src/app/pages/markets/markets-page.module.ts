import { GfHomeMarketModule } from '@ghostfolio/client/components/home-market/home-market.module';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { MarketsPageRoutingModule } from './markets-page-routing.module';
import { MarketsPageComponent } from './markets-page.component';

@NgModule({
  declarations: [MarketsPageComponent],
  imports: [CommonModule, GfHomeMarketModule, MarketsPageRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MarketsPageModule {}
