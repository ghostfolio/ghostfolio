import { Routes } from '@angular/router';

import { AuthGuard } from '../../core/auth.guard';
import { GfPricingPageComponent } from './pricing-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfPricingPageComponent,
    path: '',
    title: $localize`Pricing`
  }
];
