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
  }
];
