import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PricingPageComponent } from './pricing-page.component';

const routes: Routes = [{ path: '', component: PricingPageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PricingPageRoutingModule {}
