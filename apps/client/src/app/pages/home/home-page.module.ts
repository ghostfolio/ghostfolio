import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { RouterModule } from '@angular/router';
import { GfHomeHoldingsModule } from '@ghostfolio/client/components/home-holdings/home-holdings.module';
import { GfHomeMarketModule } from '@ghostfolio/client/components/home-market/home-market.module';
import { GfHomeOverviewModule } from '@ghostfolio/client/components/home-overview/home-overview.module';
import { GfHomeSummaryModule } from '@ghostfolio/client/components/home-summary/home-summary.module';

import { HomePageRoutingModule } from './home-page-routing.module';
import { HomePageComponent } from './home-page.component';

@NgModule({
  declarations: [HomePageComponent],
  imports: [
    CommonModule,
    GfHomeHoldingsModule,
    GfHomeMarketModule,
    GfHomeOverviewModule,
    GfHomeSummaryModule,
    HomePageRoutingModule,
    MatTabsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePageModule {}
