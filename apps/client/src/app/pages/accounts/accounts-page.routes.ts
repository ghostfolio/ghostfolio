import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AccountsPageComponent } from './accounts-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AccountsPageComponent,
    path: '',
    title: internalRoutes.accounts.title
  }
];
