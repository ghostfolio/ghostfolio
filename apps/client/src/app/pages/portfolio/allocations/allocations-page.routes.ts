import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfAllocationsPageComponent } from './allocations-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfAllocationsPageComponent,
    path: '',
    title: $localize`Allocations`
  }
];
