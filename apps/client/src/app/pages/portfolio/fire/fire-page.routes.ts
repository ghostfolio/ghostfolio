import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfFirePageComponent } from './fire-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfFirePageComponent,
    path: '',
    title: 'FIRE'
  }
];
