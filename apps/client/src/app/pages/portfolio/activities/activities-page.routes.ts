import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfActivitiesPageComponent } from './activities-page.component';
import { GfActivityDialogHostComponent } from './activity-dialog-host/activity-dialog-host.component';

const { clone, create, update } =
  internalRoutes.portfolio.subRoutes.activities.subRoutes;

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        component: GfActivityDialogHostComponent,
        data: { mode: 'create' },
        path: create.path,
        title: create.title
      },
      {
        children: [
          {
            component: GfActivityDialogHostComponent,
            data: { mode: 'clone' },
            path: clone.path,
            title: clone.title
          },
          {
            component: GfActivityDialogHostComponent,
            data: { mode: 'update' },
            path: update.path,
            title: update.title
          }
        ],
        path: ':activityId'
      }
    ],
    component: GfActivitiesPageComponent,
    path: '',
    title: internalRoutes.portfolio.subRoutes.activities.title
  }
];
