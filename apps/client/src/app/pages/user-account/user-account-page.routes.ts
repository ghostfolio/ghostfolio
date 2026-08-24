import { GfAccessDialogHostComponent } from '@ghostfolio/client/components/user-account-access/access-dialog-host/access-dialog-host.component';
import { GfUserAccountAccessComponent } from '@ghostfolio/client/components/user-account-access/user-account-access.component';
import { GfUserAccountMembershipComponent } from '@ghostfolio/client/components/user-account-membership/user-account-membership.component';
import { GfUserAccountSettingsComponent } from '@ghostfolio/client/components/user-account-settings/user-account-settings.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfUserAccountPageComponent } from './user-account-page.component';

const { access, membership } = internalRoutes.account.subRoutes;

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        component: GfUserAccountSettingsComponent,
        path: '',
        title: internalRoutes.account.title
      },
      {
        component: GfUserAccountMembershipComponent,
        path: membership.path,
        title: membership.title
      },
      {
        children: [
          {
            component: GfAccessDialogHostComponent,
            data: { mode: 'create' },
            path: access.subRoutes.create.path,
            title: access.subRoutes.create.title
          },
          {
            children: [
              {
                component: GfAccessDialogHostComponent,
                data: { mode: 'update' },
                path: access.subRoutes.update.path,
                title: access.subRoutes.update.title
              }
            ],
            path: ':accessId'
          }
        ],
        component: GfUserAccountAccessComponent,
        path: access.path,
        title: access.title
      }
    ],
    component: GfUserAccountPageComponent,
    path: '',
    title: $localize`My Ghostfolio`
  }
];
