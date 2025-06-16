import { UserAccountAccessComponent } from '@ghostfolio/client/components/user-account-access/user-account-access.component';
import { UserAccountMembershipComponent } from '@ghostfolio/client/components/user-account-membership/user-account-membership.component';
import { UserAccountSettingsComponent } from '@ghostfolio/client/components/user-account-settings/user-account-settings.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UserAccountPageComponent } from './user-account-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: UserAccountSettingsComponent,
        title: internalRoutes.userAccount.title
      },
      {
        path: internalRoutes.userAccount.subRoutes.membership.path,
        component: UserAccountMembershipComponent,
        title: internalRoutes.userAccount.subRoutes.membership.title
      },
      {
        path: internalRoutes.userAccount.subRoutes.access.path,
        component: UserAccountAccessComponent,
        title: internalRoutes.userAccount.subRoutes.access.title
      }
    ],
    component: UserAccountPageComponent,
    path: '',
    title: $localize`My Ghostfolio`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserAccountPageRoutingModule {}
