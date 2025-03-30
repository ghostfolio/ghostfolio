import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { paths } from '@ghostfolio/client/core/paths';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

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
      {
        path: paths.license,
        loadChildren: () =>
          import('./license/license-page.module').then(
            (m) => m.LicensePageModule
          )
      },
      {
        path: 'oss-friends',
        loadChildren: () =>
          import('./oss-friends/oss-friends-page.module').then(
            (m) => m.OpenSourceSoftwareFriendsPageModule
          )
      },
      {
        path: paths.privacyPolicy,
        loadChildren: () =>
          import('./privacy-policy/privacy-policy-page.module').then(
            (m) => m.PrivacyPolicyPageModule
          )
      },
      {
        path: paths.termsOfService,
        loadChildren: () =>
          import('./terms-of-service/terms-of-service-page.module').then(
            (m) => m.TermsOfServicePageModule
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
