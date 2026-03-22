import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./k1-import-page.component').then(
        (c) => c.K1ImportPageComponent
      ),
    path: '',
    title: 'K-1 Import'
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./k1-verification/k1-verification.component').then(
        (c) => c.K1VerificationComponent
      ),
    path: ':id/verify',
    title: 'Verify K-1 Import'
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./k1-confirmation/k1-confirmation.component').then(
        (c) => c.K1ConfirmationComponent
      ),
    path: ':id/confirm',
    title: 'Confirm K-1 Import'
  }
];
