import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AuthGuard } from '../../core/auth.guard';
import { GfLandingPageComponent } from './landing-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfLandingPageComponent,
    path: '',
    title: publicRoutes.register.title
  }
];
