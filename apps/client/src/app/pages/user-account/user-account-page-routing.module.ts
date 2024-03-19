import { UserAccountAccessComponent } from '@ghostfolio/client/components/user-account-access/user-account-access.component';
import { UserAccountMembershipComponent } from '@ghostfolio/client/components/user-account-membership/user-account-membership.component';
import { UserAccountSettingsComponent } from '@ghostfolio/client/components/user-account-settings/user-account-settings.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

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
        title: $localize`Settings`
      },
      {
        path: 'membership',
        component: UserAccountMembershipComponent,
        title: $localize`Membership`
      },
      {
        path: 'access',
        component: UserAccountAccessComponent,
        title: $localize`Access`
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
