import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { AllocationsPageComponent } from './allocations-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AllocationsPageComponent,
    path: '',
    title: $localize`Allocations`
  }
];
