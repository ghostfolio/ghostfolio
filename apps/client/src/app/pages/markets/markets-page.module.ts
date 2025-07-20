import { HomeMarketComponent } from '@ghostfolio/client/components/home-market/home-market.component';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { MarketsPageRoutingModule } from './markets-page-routing.module';
import { MarketsPageComponent } from './markets-page.component';

@NgModule({
  declarations: [MarketsPageComponent],
  imports: [CommonModule, HomeMarketComponent, MarketsPageRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MarketsPageModule {}
