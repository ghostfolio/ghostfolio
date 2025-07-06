import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfAboutOverviewPageComponent } from './about-overview-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfAboutOverviewPageComponent,
    path: '',
    title: $localize`About`
  }
];
