import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./cell-mapping-page.component').then(
        (c) => c.CellMappingPageComponent
      ),
    path: '',
    title: 'Cell Mapping'
  }
];
