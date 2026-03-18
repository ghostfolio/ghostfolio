import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { DashboardPageComponent } from './dashboard-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: DashboardPageComponent,
    path: '',
    title: $localize`Family Office Dashboard`
  }
];
