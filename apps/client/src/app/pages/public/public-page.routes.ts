import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import type { Routes } from '@angular/router';

import { GfPublicPageComponent } from './public-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfPublicPageComponent,
    path: ':id'
  }
];
