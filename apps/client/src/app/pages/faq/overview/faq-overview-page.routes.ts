import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfFaqOverviewPageComponent } from './faq-overview-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfFaqOverviewPageComponent,
    path: '',
    title: $localize`Frequently Asked Questions (FAQ)`
  }
];
