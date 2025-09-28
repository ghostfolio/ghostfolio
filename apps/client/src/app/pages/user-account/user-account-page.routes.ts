import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfUserAccountAccessComponent } from '../../components/user-account-access/user-account-access.component';
import { GfUserAccountMembershipComponent } from '../../components/user-account-membership/user-account-membership.component';
import { GfUserAccountSettingsComponent } from '../../components/user-account-settings/user-account-settings.component';
import { AuthGuard } from '../../core/auth.guard';
import { GfUserAccountPageComponent } from './user-account-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: GfUserAccountSettingsComponent,
        title: internalRoutes.account.title
      },
      {
        path: internalRoutes.account.subRoutes.membership.path,
        component: GfUserAccountMembershipComponent,
        title: internalRoutes.account.subRoutes.membership.title
      },
      {
        path: internalRoutes.account.subRoutes.access.path,
        component: GfUserAccountAccessComponent,
        title: internalRoutes.account.subRoutes.access.title
      }
    ],
    component: GfUserAccountPageComponent,
    path: '',
    title: $localize`My Ghostfolio`
  }
];
