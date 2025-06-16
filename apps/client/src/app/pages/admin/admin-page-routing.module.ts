import { AdminJobsComponent } from '@ghostfolio/client/components/admin-jobs/admin-jobs.component';
import { AdminMarketDataComponent } from '@ghostfolio/client/components/admin-market-data/admin-market-data.component';
import { AdminOverviewComponent } from '@ghostfolio/client/components/admin-overview/admin-overview.component';
import { AdminSettingsComponent } from '@ghostfolio/client/components/admin-settings/admin-settings.component';
import { AdminUsersComponent } from '@ghostfolio/client/components/admin-users/admin-users.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AdminPageComponent } from './admin-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: AdminOverviewComponent,
        title: internalRoutes.adminControl.title
      },
      {
        path: internalRoutes.adminControl.subRoutes.jobs.path,
        component: AdminJobsComponent,
        title: internalRoutes.adminControl.subRoutes.jobs.title
      },
      {
        path: internalRoutes.adminControl.subRoutes.marketData.path,
        component: AdminMarketDataComponent,
        title: internalRoutes.adminControl.subRoutes.marketData.title
      },
      {
        path: internalRoutes.adminControl.subRoutes.settings.path,
        component: AdminSettingsComponent,
        title: internalRoutes.adminControl.subRoutes.settings.title
      },
      {
        path: internalRoutes.adminControl.subRoutes.users.path,
        component: AdminUsersComponent,
        title: internalRoutes.adminControl.subRoutes.users.title
      }
    ],
    component: AdminPageComponent,
    path: ''
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminPageRoutingModule {}
