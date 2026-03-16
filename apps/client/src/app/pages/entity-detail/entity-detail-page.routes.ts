import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfEntityDetailPageComponent } from './entity-detail-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfEntityDetailPageComponent,
    path: '',
    title: 'Entity Detail'
  }
];
