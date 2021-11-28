import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeHoldingsComponent } from '@ghostfolio/client/components/home-holdings/home-holdings.component';
import { HomeMarketComponent } from '@ghostfolio/client/components/home-market/home-market.component';
import { HomeOverviewComponent } from '@ghostfolio/client/components/home-overview/home-overview.component';
import { HomeSummaryComponent } from '@ghostfolio/client/components/home-summary/home-summary.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { HomePageComponent } from './home-page.component';

const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: HomeOverviewComponent },
      { path: 'holdings', component: HomeHoldingsComponent },
      { path: 'summary', component: HomeSummaryComponent },
      { path: 'market', component: HomeMarketComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomePageRoutingModule {}
