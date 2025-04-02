import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TermsOfServicePageComponent } from './terms-of-service-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: TermsOfServicePageComponent,
    path: '',
    title: $localize`Terms of Service`
  }
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)]
})
export class TermsOfServicePageRoutingModule {}
