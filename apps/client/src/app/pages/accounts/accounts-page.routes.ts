import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfAccountDialogHostComponent } from './account-dialog-host/account-dialog-host.component';
import { GfAccountsPageComponent } from './accounts-page.component';

const { create, detail, transferCashBalance, update } =
  internalRoutes.accounts.subRoutes;

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        component: GfAccountDialogHostComponent,
        data: { mode: 'create' },
        path: create.path,
        title: create.title
      },
      {
        component: GfAccountDialogHostComponent,
        data: { mode: 'transferCashBalance' },
        path: transferCashBalance.path,
        title: transferCashBalance.title
      },
      {
        children: [
          {
            component: GfAccountDialogHostComponent,
            data: { mode: 'detail' },
            path: '',
            title: detail.title
          },
          {
            component: GfAccountDialogHostComponent,
            data: { mode: 'update' },
            path: update.path,
            title: update.title
          }
        ],
        path: ':accountId'
      }
    ],
    component: GfAccountsPageComponent,
    path: '',
    title: internalRoutes.accounts.title
  }
];
