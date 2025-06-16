import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

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
        path: publicRoutes.about.subRoutes.changelog.path,
        loadChildren: () =>
          import('./changelog/changelog-page.module').then(
            (m) => m.ChangelogPageModule
          )
      },
      {
        path: publicRoutes.about.subRoutes.license.path,
        loadChildren: () =>
          import('./license/license-page.module').then(
            (m) => m.LicensePageModule
          )
      },
      {
        path: publicRoutes.about.subRoutes.ossFriends.path,
        loadChildren: () =>
          import('./oss-friends/oss-friends-page.module').then(
            (m) => m.OpenSourceSoftwareFriendsPageModule
          )
      },
      {
        path: publicRoutes.about.subRoutes.privacyPolicy.path,
        loadChildren: () =>
          import('./privacy-policy/privacy-policy-page.module').then(
            (m) => m.PrivacyPolicyPageModule
          )
      },
      {
        path: publicRoutes.about.subRoutes.termsOfService.path,
        loadChildren: () =>
          import('./terms-of-service/terms-of-service-page.module').then(
            (m) => m.TermsOfServicePageModule
          )
      }
    ],
    component: AboutPageComponent,
    path: '',
    title: publicRoutes.about.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AboutPageRoutingModule {}
