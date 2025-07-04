import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { FirePageComponent } from './fire-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: FirePageComponent,
    path: '',
    title: 'FIRE'
  }
];
