import { HomeHoldingsComponent } from '@ghostfolio/client/components/home-holdings/home-holdings.component';
import { HomeOverviewComponent } from '@ghostfolio/client/components/home-overview/home-overview.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ZenPageComponent } from './zen-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: HomeOverviewComponent
      },
      {
        path: internalRoutes.zen.subRoutes.holdings.path,
        component: HomeHoldingsComponent,
        title: internalRoutes.home.subRoutes.holdings.title
      }
    ],
    component: ZenPageComponent,
    path: '',
    title: internalRoutes.zen.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ZenPageRoutingModule {}
