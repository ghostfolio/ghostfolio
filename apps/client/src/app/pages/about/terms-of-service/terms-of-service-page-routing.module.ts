import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TermsOfServicePageComponent } from './terms-of-service-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: TermsOfServicePageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.termsOfService.title
  }
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)]
})
export class TermsOfServicePageRoutingModule {}
