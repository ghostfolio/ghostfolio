import { GfHomeHoldingsComponent } from '@ghostfolio/client/components/home-holdings/home-holdings.component';
import { GfHomeMarketComponent } from '@ghostfolio/client/components/home-market/home-market.component';
import { GfHomeOverviewComponent } from '@ghostfolio/client/components/home-overview/home-overview.component';
import { GfHomeSummaryComponent } from '@ghostfolio/client/components/home-summary/home-summary.component';
import { GfHomeWatchlistComponent } from '@ghostfolio/client/components/home-watchlist/home-watchlist.component';
import { GfMarketsComponent } from '@ghostfolio/client/components/markets/markets.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfHomePageComponent } from './home-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: GfHomeOverviewComponent
      },
      {
        path: internalRoutes.home.subRoutes.holdings.path,
        component: GfHomeHoldingsComponent,
        title: internalRoutes.home.subRoutes.holdings.title
      },
      {
        path: internalRoutes.home.subRoutes.summary.path,
        component: GfHomeSummaryComponent,
        title: internalRoutes.home.subRoutes.summary.title
      },
      {
        path: internalRoutes.home.subRoutes.markets.path,
        component: GfHomeMarketComponent,
        title: internalRoutes.home.subRoutes.markets.title
      },
      {
        path: internalRoutes.home.subRoutes.marketsPremium.path,
        component: GfMarketsComponent,
        title: internalRoutes.home.subRoutes.marketsPremium.title
      },
      {
        path: internalRoutes.home.subRoutes.watchlist.path,
        component: GfHomeWatchlistComponent,
        title: internalRoutes.home.subRoutes.watchlist.title
      }
    ],
    component: GfHomePageComponent,
    path: '',
    title: internalRoutes.home.title
  }
];
