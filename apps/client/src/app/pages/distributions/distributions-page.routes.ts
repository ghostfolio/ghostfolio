import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfDistributionsPageComponent } from './distributions-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfDistributionsPageComponent,
    path: '',
    title: 'Distributions'
  }
];
