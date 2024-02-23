import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PricingPageComponent } from './pricing-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: PricingPageComponent,
    path: '',
    title: $localize`Pricing`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PricingPageRoutingModule {}
