import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { ActivitiesPageComponent } from './activities-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ActivitiesPageComponent,
    path: '',
    title: internalRoutes.portfolio.subRoutes.activities.title
  }
];
