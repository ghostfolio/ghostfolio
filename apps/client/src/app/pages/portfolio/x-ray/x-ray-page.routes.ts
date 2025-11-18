import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfXRayPageComponent } from './x-ray-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfXRayPageComponent,
    path: '',
    title: 'X-ray'
  }
];
