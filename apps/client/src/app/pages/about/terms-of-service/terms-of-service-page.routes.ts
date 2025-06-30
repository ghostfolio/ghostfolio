import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { TermsOfServicePageComponent } from './terms-of-service-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: TermsOfServicePageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.termsOfService.title
  }
];
