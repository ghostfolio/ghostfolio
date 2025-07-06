import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { PrivacyPolicyPageComponent } from './privacy-policy-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: PrivacyPolicyPageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.privacyPolicy.title
  }
];
