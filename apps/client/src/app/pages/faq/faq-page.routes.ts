import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { FaqPageComponent } from './faq-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./overview/faq-overview-page.routes').then((m) => m.routes)
      },
      {
        path: publicRoutes.faq.subRoutes.saas.path,
        loadChildren: () =>
          import('./saas/saas-page.routes').then((m) => m.routes)
      },
      {
        path: publicRoutes.faq.subRoutes.selfHosting.path,
        loadChildren: () =>
          import('./self-hosting/self-hosting-page.routes').then(
            (m) => m.routes
          )
      }
    ],
    component: FaqPageComponent,
    path: '',
    title: publicRoutes.faq.title
  }
];
