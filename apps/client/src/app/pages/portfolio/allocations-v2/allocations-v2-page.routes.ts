import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfAllocationsV2PageComponent } from './allocations-v2-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfAllocationsV2PageComponent,
    path: '',
    title: $localize`Allocations V2`
  }
];
