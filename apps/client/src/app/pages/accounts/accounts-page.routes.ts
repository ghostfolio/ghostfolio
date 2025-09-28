import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AuthGuard } from '../../core/auth.guard';
import { GfAccountsPageComponent } from './accounts-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfAccountsPageComponent,
    path: '',
    title: internalRoutes.accounts.title
  }
];
