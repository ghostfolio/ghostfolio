import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import type { Routes } from '@angular/router';

import { GfFirePageComponent } from './fire-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfFirePageComponent,
    path: '',
    title: 'FIRE'
  }
];
