import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfSelfHostingPageComponent } from './self-hosting-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfSelfHostingPageComponent,
    path: '',
    title: `${publicRoutes.faq.subRoutes.selfHosting.title} - ${publicRoutes.faq.title}`
  }
];
