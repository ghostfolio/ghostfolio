import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { FaqOverviewPageComponent } from './faq-overview-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: FaqOverviewPageComponent,
    path: '',
    title: $localize`Frequently Asked Questions (FAQ)`
  }
];
