import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { FmvPageComponent } from './fmv-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: FmvPageComponent,
    path: '',
    title: $localize`FMV Dashboard`
  }
];
