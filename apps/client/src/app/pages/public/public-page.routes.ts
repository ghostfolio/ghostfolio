import { Routes } from '@angular/router';

import { AuthGuard } from '../../core/auth.guard';
import { GfPublicPageComponent } from './public-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfPublicPageComponent,
    path: ':id'
  }
];
