import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfAuthPageComponent } from './auth-page.component';

export const routes: Routes = [
  {
    component: GfAuthPageComponent,
    path: '',
    title: internalRoutes.auth.title
  },
  {
    component: GfAuthPageComponent,
    path: ':jwt',
    title: internalRoutes.auth.title
  }
];
