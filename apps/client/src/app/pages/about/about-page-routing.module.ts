import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { AboutPageComponent } from './about-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./overview/about-overview-page.module').then(
            (m) => m.AboutOverviewPageModule
          )
      },
      {
        path: 'changelog',
        loadChildren: () =>
          import('./changelog/changelog-page.module').then(
            (m) => m.ChangelogPageModule
          )
      },
      ...[
        'license',
        /////
        'licence',
        'licencia',
        'licentie',
        'lizenz',
        'licenza'
      ].map((path) => ({
        path,
        loadChildren: () =>
          import('./license/license-page.module').then(
            (m) => m.LicensePageModule
          )
      })),
      {
        path: 'privacy-policy',
        loadChildren: () =>
          import('./privacy-policy/privacy-policy-page.module').then(
            (m) => m.PrivacyPolicyPageModule
          )
      }
    ],
    component: AboutPageComponent,
    path: '',
    title: $localize`About`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AboutPageRoutingModule {}
