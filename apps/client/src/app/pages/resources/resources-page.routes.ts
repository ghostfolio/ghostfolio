import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { ResourcesPageComponent } from './resources-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ResourcesPageComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./overview/resources-overview.routes').then((m) => m.routes)
      },
      {
        path: publicRoutes.resources.subRoutes.glossary.path,
        loadChildren: () =>
          import('./glossary/resources-glossary.routes').then((m) => m.routes)
      },
      {
        path: publicRoutes.resources.subRoutes.guides.path,
        loadChildren: () =>
          import('./guides/resources-guides.routes').then((m) => m.routes)
      },
      {
        path: publicRoutes.resources.subRoutes.markets.path,
        loadChildren: () =>
          import('./markets/resources-markets.routes').then((m) => m.routes)
      },
      {
        path: publicRoutes.resources.subRoutes.personalFinanceTools.path,
        loadChildren: () =>
          import(
            './personal-finance-tools/personal-finance-tools-page.routes'
          ).then((m) => m.routes)
      }
    ],
    path: '',
    title: publicRoutes.resources.title
  }
];
