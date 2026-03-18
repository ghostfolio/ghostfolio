import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { PortfolioViewsPageComponent } from './portfolio-views-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: PortfolioViewsPageComponent,
    path: '',
    title: $localize`Portfolio Views`
  }
];
