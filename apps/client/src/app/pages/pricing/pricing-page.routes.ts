import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfPricingPageComponent } from './pricing-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfPricingPageComponent,
    path: '',
    title: $localize`Pricing`
  }
];
