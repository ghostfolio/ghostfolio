import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfPartnershipsPageComponent } from './partnerships-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfPartnershipsPageComponent,
    path: '',
    title: $localize`Partnerships`
  }
];
