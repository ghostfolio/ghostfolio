import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfXRayPageComponent } from './x-ray-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfXRayPageComponent,
    path: '',
    title: 'X-ray'
  }
];
