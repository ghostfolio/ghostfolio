import { HomeHoldingsComponent } from '@ghostfolio/client/components/home-holdings/home-holdings.component';
import { HomeMarketComponent } from '@ghostfolio/client/components/home-market/home-market.component';
import { HomeOverviewComponent } from '@ghostfolio/client/components/home-overview/home-overview.component';
import { HomeSummaryComponent } from '@ghostfolio/client/components/home-summary/home-summary.component';
import { HomeWatchlistComponent } from '@ghostfolio/client/components/home-watchlist/home-watchlist.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { paths } from '@ghostfolio/common/paths';

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
        path: paths.holdings,
        component: HomeHoldingsComponent,
        title: $localize`Holdings`
      },
      {
        path: paths.summary,
        component: HomeSummaryComponent,
        title: $localize`Summary`
      },
      {
        path: paths.market,
        component: HomeMarketComponent,
        title: $localize`Markets`
      },
      {
        path: paths.watchlist,
        component: HomeWatchlistComponent,
        title: $localize`Watchlist`
      }
    ],
    component: HomePageComponent,
    path: ''
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule {}
