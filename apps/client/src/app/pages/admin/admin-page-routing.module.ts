import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminOverviewComponent } from '@ghostfolio/client/components/admin-overview/admin-overview.component';
import { AdminUsersComponent } from '@ghostfolio/client/components/admin-users/admin-users.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { AdminPageComponent } from './admin-page.component';

const routes: Routes = [
  {
    path: '',
    component: AdminPageComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: AdminOverviewComponent },
      { path: 'users', component: AdminUsersComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminPageRoutingModule {}
