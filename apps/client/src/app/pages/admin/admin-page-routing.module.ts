import { AdminJobsComponent } from '@ghostfolio/client/components/admin-jobs/admin-jobs.component';
import { AdminMarketDataComponent } from '@ghostfolio/client/components/admin-market-data/admin-market-data.component';
import { AdminOverviewComponent } from '@ghostfolio/client/components/admin-overview/admin-overview.component';
import { AdminSettingsComponent } from '@ghostfolio/client/components/admin-settings/admin-settings.component';
import { AdminUsersComponent } from '@ghostfolio/client/components/admin-users/admin-users.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { routes as ghostfolioRoutes } from '@ghostfolio/common/routes/routes';

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
        title: $localize`Admin Control`
      },
      {
        path: ghostfolioRoutes.jobs,
        component: AdminJobsComponent,
        title: $localize`Job Queue`
      },
      {
        path: ghostfolioRoutes.marketData,
        component: AdminMarketDataComponent,
        title: $localize`Market Data`
      },
      {
        path: ghostfolioRoutes.settings,
        component: AdminSettingsComponent,
        title: $localize`Settings`
      },
      {
        path: ghostfolioRoutes.users,
        component: AdminUsersComponent,
        title: $localize`Users`
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
