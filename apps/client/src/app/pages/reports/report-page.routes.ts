import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { ReportPageComponent } from './report-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ReportPageComponent,
    path: '',
    title: $localize`Reports`
  }
];
