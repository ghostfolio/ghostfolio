import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfPartnershipDetailPageComponent } from './partnership-detail-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfPartnershipDetailPageComponent,
    path: '',
    title: 'Partnership Detail'
  }
];
