import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SelfHostingPageComponent } from './self-hosting-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: SelfHostingPageComponent,
    path: '',
    title: `${publicRoutes.faq.subRoutes.selfHosting.title} - ${publicRoutes.faq.title}`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SelfHostingPageRoutingModule {}
