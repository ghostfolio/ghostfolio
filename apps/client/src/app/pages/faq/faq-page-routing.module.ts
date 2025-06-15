import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FaqPageComponent } from './faq-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./overview/faq-overview-page.module').then(
            (m) => m.FaqOverviewPageModule
          )
      },
      {
        path: publicRoutes.faq.subRoutes.saas.path,
        loadChildren: () =>
          import('./saas/saas-page.module').then((m) => m.SaasPageModule)
      },
      {
        path: publicRoutes.faq.subRoutes.selfHosting.path,
        loadChildren: () =>
          import('./self-hosting/self-hosting-page.module').then(
            (m) => m.SelfHostingPageModule
          )
      }
    ],
    component: FaqPageComponent,
    path: '',
    title: publicRoutes.faq.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FaqPageRoutingModule {}
