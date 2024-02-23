import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FaqOverviewPageComponent } from './faq-overview-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: FaqOverviewPageComponent,
    path: '',
    title: $localize`Frequently Asked Questions (FAQ)`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FaqOverviewPageRoutingModule {}
