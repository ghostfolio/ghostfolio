import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { AboutOverviewPageComponent } from './about-overview-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AboutOverviewPageComponent,
    path: '',
    title: $localize`About`
  }
];
