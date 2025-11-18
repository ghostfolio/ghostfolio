import { GfHomeHoldingsComponent } from '@ghostfolio/client/components/home-holdings/home-holdings.component';
import { GfHomeOverviewComponent } from '@ghostfolio/client/components/home-overview/home-overview.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfZenPageComponent } from './zen-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: GfHomeOverviewComponent
      },
      {
        path: internalRoutes.zen.subRoutes.holdings.path,
        component: GfHomeHoldingsComponent,
        title: internalRoutes.home.subRoutes.holdings.title
      }
    ],
    component: GfZenPageComponent,
    path: '',
    title: internalRoutes.zen.title
  }
];
