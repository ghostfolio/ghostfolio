import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { PartnershipPerformancePageComponent } from './partnership-performance-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: PartnershipPerformancePageComponent,
    path: '',
    title: 'Partnership Performance'
  }
];
