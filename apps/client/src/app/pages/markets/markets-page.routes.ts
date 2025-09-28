import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AuthGuard } from '../../core/auth.guard';
import { GfMarketsPageComponent } from './markets-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./markets-page.component').then(
            (m) => m.GfMarketsPageComponent
          )
      }
    ],
    component: GfMarketsPageComponent,
    path: '',
    title: publicRoutes.markets.title
  }
];
