import { GfHomeHoldingsModule } from '@ghostfolio/client/components/home-holdings/home-holdings.module';
import { GfHomeMarketModule } from '@ghostfolio/client/components/home-market/home-market.module';
import { GfHomeOverviewModule } from '@ghostfolio/client/components/home-overview/home-overview.module';
import { GfHomeSummaryModule } from '@ghostfolio/client/components/home-summary/home-summary.module';
import { HomeWatchlistComponent } from '@ghostfolio/client/components/home-watchlist/home-watchlist.component';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

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
    IonIcon,
    HomePageRoutingModule,
    HomeWatchlistComponent,
    MatTabsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePageModule {}
