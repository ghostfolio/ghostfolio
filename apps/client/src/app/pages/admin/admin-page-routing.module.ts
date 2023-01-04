import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminJobsComponent } from '@ghostfolio/client/components/admin-jobs/admin-jobs.component';
import { AdminMarketDataComponent } from '@ghostfolio/client/components/admin-market-data/admin-market-data.component';
import { AdminOverviewComponent } from '@ghostfolio/client/components/admin-overview/admin-overview.component';
import { AdminUsersComponent } from '@ghostfolio/client/components/admin-users/admin-users.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { AdminPageComponent } from './admin-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'jobs', component: AdminJobsComponent, title: $localize`Jobs` },
      {
        path: 'market-data',
        component: AdminMarketDataComponent,
        title: $localize`Market Data`
      },
      {
        path: 'overview',
        component: AdminOverviewComponent,
        title: $localize`Admin Control`
      },
      { path: 'users', component: AdminUsersComponent, title: $localize`Users` }
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
