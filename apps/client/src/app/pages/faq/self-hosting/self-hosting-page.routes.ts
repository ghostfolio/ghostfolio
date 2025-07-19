import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { SelfHostingPageComponent } from './self-hosting-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: SelfHostingPageComponent,
    path: '',
    title: `${publicRoutes.faq.subRoutes.selfHosting.title} - ${publicRoutes.faq.title}`
  }
];
