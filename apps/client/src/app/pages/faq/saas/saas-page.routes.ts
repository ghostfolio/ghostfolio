import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { SaasPageComponent } from './saas-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: SaasPageComponent,
    path: '',
    title: `${publicRoutes.faq.subRoutes.saas.title} - ${publicRoutes.faq.title}`
  }
];
