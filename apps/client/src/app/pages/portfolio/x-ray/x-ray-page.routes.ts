import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { XRayPageComponent } from './x-ray-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: XRayPageComponent,
    path: '',
    title: 'X-ray'
  }
];
