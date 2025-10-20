import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfActivitiesPageComponent } from './activities-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfActivitiesPageComponent,
    path: '',
    title: internalRoutes.portfolio.subRoutes.activities.title
  }
];
