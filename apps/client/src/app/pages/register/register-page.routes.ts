import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AuthGuard } from '../../core/auth.guard';
import { GfRegisterPageComponent } from './register-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfRegisterPageComponent,
    path: '',
    title: publicRoutes.register.title
  }
];
