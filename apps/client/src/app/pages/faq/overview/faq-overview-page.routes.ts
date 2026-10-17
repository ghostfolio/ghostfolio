import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import type { Routes } from '@angular/router';

import { GfFaqOverviewPageComponent } from './faq-overview-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfFaqOverviewPageComponent,
    path: '',
    title: $localize`Frequently Asked Questions (FAQ)`
  }
];
