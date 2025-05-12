import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { paths } from '@ghostfolio/client/core/paths';

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
        path: paths.saas,
        loadChildren: () =>
          import('./saas/saas-page.module').then((m) => m.SaasPageModule)
      },
      {
        path: paths.selfHosting,
        loadChildren: () =>
          import('./self-hosting/self-hosting-page.module').then(
            (m) => m.SelfHostingPageModule
          )
      }
    ],
    component: FaqPageComponent,
    path: '',
    title: $localize`Frequently Asked Questions (FAQ)`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FaqPageRoutingModule {}
