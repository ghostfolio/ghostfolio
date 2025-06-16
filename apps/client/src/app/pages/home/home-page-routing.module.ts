import { HomeHoldingsComponent } from '@ghostfolio/client/components/home-holdings/home-holdings.component';
import { HomeMarketComponent } from '@ghostfolio/client/components/home-market/home-market.component';
import { HomeOverviewComponent } from '@ghostfolio/client/components/home-overview/home-overview.component';
import { HomeSummaryComponent } from '@ghostfolio/client/components/home-summary/home-summary.component';
import { HomeWatchlistComponent } from '@ghostfolio/client/components/home-watchlist/home-watchlist.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import {
  routes as ghostfolioRoutes,
  internalRoutes
} from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomePageComponent } from './home-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: HomeOverviewComponent
      },
      {
        path: internalRoutes.home.subRoutes.holdings.path,
        component: HomeHoldingsComponent,
        title: internalRoutes.home.subRoutes.holdings.title
      },
      {
        path: internalRoutes.home.subRoutes.summary.path,
        component: HomeSummaryComponent,
        title: internalRoutes.home.subRoutes.summary.title
      },
      {
        path: ghostfolioRoutes.market,
        component: HomeMarketComponent,
        title: $localize`Markets`
      },
      {
        path: internalRoutes.home.subRoutes.watchlist.path,
        component: HomeWatchlistComponent,
        title: internalRoutes.home.subRoutes.watchlist.title
      }
    ],
    component: HomePageComponent,
    path: '',
    title: internalRoutes.home.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule {}
