import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfPrivacyPolicyPageComponent } from './privacy-policy-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfPrivacyPolicyPageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.privacyPolicy.title
  }
];
