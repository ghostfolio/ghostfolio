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
      { path: 'jobs', component: AdminJobsComponent },
      { path: 'market-data', component: AdminMarketDataComponent },
      { path: 'overview', component: AdminOverviewComponent },
      { path: 'users', component: AdminUsersComponent }
    ],
    component: AdminPageComponent,
    path: '',
    title: 'Admin Control'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminPageRoutingModule {}
