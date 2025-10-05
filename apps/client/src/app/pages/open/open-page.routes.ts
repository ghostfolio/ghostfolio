import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfOpenPageComponent } from './open-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfOpenPageComponent,
    path: '',
    title: publicRoutes.openStartup.title
  }
];
