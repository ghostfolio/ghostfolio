import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SaasPageComponent } from './saas-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: SaasPageComponent,
    path: '',
    title: `${publicRoutes.faq.subRoutes.saas.title} - ${publicRoutes.faq.title}`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SaasPageRoutingModule {}
