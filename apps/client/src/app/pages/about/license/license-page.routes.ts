import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfLicensePageComponent } from './license-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfLicensePageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.license.title
  }
];
