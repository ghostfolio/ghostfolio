import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfAllocationsPageComponent } from './allocations-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfAllocationsPageComponent,
    path: '',
    title: $localize`Allocations`
  }
];
