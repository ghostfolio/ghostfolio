import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { routes as ghostfolioRoutes } from '@ghostfolio/common/routes/routes';

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
        path: ghostfolioRoutes.changelog,
        loadChildren: () =>
          import('./changelog/changelog-page.module').then(
            (m) => m.ChangelogPageModule
          )
      },
      {
        path: ghostfolioRoutes.license,
        loadChildren: () =>
          import('./license/license-page.module').then(
            (m) => m.LicensePageModule
          )
      },
      {
        path: ghostfolioRoutes.ossFriends,
        loadChildren: () =>
          import('./oss-friends/oss-friends-page.module').then(
            (m) => m.OpenSourceSoftwareFriendsPageModule
          )
      },
      {
        path: ghostfolioRoutes.privacyPolicy,
        loadChildren: () =>
          import('./privacy-policy/privacy-policy-page.module').then(
            (m) => m.PrivacyPolicyPageModule
          )
      },
      {
        path: ghostfolioRoutes.termsOfService,
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
