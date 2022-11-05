import { NgModule } from '@angular/core';
import { RouterModule, Routes, TitleStrategy } from '@angular/router';
import { PageTitleStrategy } from '@ghostfolio/client/services/page-title.strategy';

import { ModulePreloadService } from './core/module-preload.service';

const routes: Routes = [
  {
    path: 'about',
    loadChildren: () =>
      import('./pages/about/about-page.module').then((m) => m.AboutPageModule)
  },
  {
    path: 'about/changelog',
    loadChildren: () =>
      import('./pages/about/changelog/changelog-page.module').then(
        (m) => m.ChangelogPageModule
      )
  },
  {
    path: 'about/privacy-policy',
    loadChildren: () =>
      import('./pages/about/privacy-policy/privacy-policy-page.module').then(
        (m) => m.PrivacyPolicyPageModule
      )
  },
  {
    path: 'account',
    loadChildren: () =>
      import('./pages/account/account-page.module').then(
        (m) => m.AccountPageModule
      )
  },
  {
    path: 'accounts',
    loadChildren: () =>
      import('./pages/accounts/accounts-page.module').then(
        (m) => m.AccountsPageModule
      )
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./pages/admin/admin-page.module').then((m) => m.AdminPageModule)
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./pages/auth/auth-page.module').then((m) => m.AuthPageModule)
  },
  {
    path: 'blog',
    loadChildren: () =>
      import('./pages/blog/blog-page.module').then((m) => m.BlogPageModule)
  },
  {
    path: 'blog/2021/07/hallo-ghostfolio',
    loadChildren: () =>
      import(
        './pages/blog/2021/07/hallo-ghostfolio/hallo-ghostfolio-page.module'
      ).then((m) => m.HalloGhostfolioPageModule)
  },
  {
    path: 'blog/2021/07/hello-ghostfolio',
    loadChildren: () =>
      import(
        './pages/blog/2021/07/hello-ghostfolio/hello-ghostfolio-page.module'
      ).then((m) => m.HelloGhostfolioPageModule)
  },
  {
    path: 'blog/2022/01/ghostfolio-first-months-in-open-source',
    loadChildren: () =>
      import(
        './pages/blog/2022/01/first-months-in-open-source/first-months-in-open-source-page.module'
      ).then((m) => m.FirstMonthsInOpenSourcePageModule)
  },
  {
    path: 'blog/2022/07/ghostfolio-meets-internet-identity',
    loadChildren: () =>
      import(
        './pages/blog/2022/07/ghostfolio-meets-internet-identity/ghostfolio-meets-internet-identity-page.module'
      ).then((m) => m.GhostfolioMeetsInternetIdentityPageModule)
  },
  {
    path: 'blog/2022/07/how-do-i-get-my-finances-in-order',
    loadChildren: () =>
      import(
        './pages/blog/2022/07/how-do-i-get-my-finances-in-order/how-do-i-get-my-finances-in-order-page.module'
      ).then((m) => m.HowDoIGetMyFinancesInOrderPageModule)
  },
  {
    path: 'blog/2022/08/500-stars-on-github',
    loadChildren: () =>
      import(
        './pages/blog/2022/08/500-stars-on-github/500-stars-on-github-page.module'
      ).then((m) => m.FiveHundredStarsOnGitHubPageModule)
  },
  {
    path: 'blog/2022/10/hacktoberfest-2022',
    loadChildren: () =>
      import(
        './pages/blog/2022/10/hacktoberfest-2022/hacktoberfest-2022-page.module'
      ).then((m) => m.Hacktoberfest2022PageModule)
  },
  {
    path: 'demo',
    loadChildren: () =>
      import('./pages/demo/demo-page.module').then((m) => m.DemoPageModule)
  },
  {
    path: 'faq',
    loadChildren: () =>
      import('./pages/faq/faq-page.module').then((m) => m.FaqPageModule)
  },
  {
    path: 'features',
    loadChildren: () =>
      import('./pages/features/features-page.module').then(
        (m) => m.FeaturesPageModule
      )
  },
  {
    path: 'home',
    loadChildren: () =>
      import('./pages/home/home-page.module').then((m) => m.HomePageModule)
  },
  {
    path: 'markets',
    loadChildren: () =>
      import('./pages/markets/markets-page.module').then(
        (m) => m.MarketsPageModule
      )
  },
  {
    path: 'p',
    loadChildren: () =>
      import('./pages/public/public-page.module').then(
        (m) => m.PublicPageModule
      )
  },
  {
    path: 'portfolio',
    loadChildren: () =>
      import('./pages/portfolio/portfolio-page.module').then(
        (m) => m.PortfolioPageModule
      )
  },
  {
    path: 'portfolio/activities',
    loadChildren: () =>
      import('./pages/portfolio/activities/activities-page.module').then(
        (m) => m.ActivitiesPageModule
      )
  },
  {
    path: 'portfolio/allocations',
    loadChildren: () =>
      import('./pages/portfolio/allocations/allocations-page.module').then(
        (m) => m.AllocationsPageModule
      )
  },
  {
    path: 'portfolio/analysis',
    loadChildren: () =>
      import('./pages/portfolio/analysis/analysis-page.module').then(
        (m) => m.AnalysisPageModule
      )
  },
  {
    path: 'portfolio/fire',
    loadChildren: () =>
      import('./pages/portfolio/fire/fire-page.module').then(
        (m) => m.FirePageModule
      )
  },
  {
    path: 'portfolio/holdings',
    loadChildren: () =>
      import('./pages/portfolio/holdings/holdings-page.module').then(
        (m) => m.HoldingsPageModule
      )
  },
  {
    path: 'portfolio/report',
    loadChildren: () =>
      import('./pages/portfolio/report/report-page.module').then(
        (m) => m.ReportPageModule
      )
  },
  {
    path: 'pricing',
    loadChildren: () =>
      import('./pages/pricing/pricing-page.module').then(
        (m) => m.PricingPageModule
      )
  },
  {
    path: 'register',
    loadChildren: () =>
      import('./pages/register/register-page.module').then(
        (m) => m.RegisterPageModule
      )
  },
  {
    path: 'resources',
    loadChildren: () =>
      import('./pages/resources/resources-page.module').then(
        (m) => m.ResourcesPageModule
      )
  },
  {
    path: 'start',
    loadChildren: () =>
      import('./pages/landing/landing-page.module').then(
        (m) => m.LandingPageModule
      )
  },
  {
    path: 'webauthn',
    loadChildren: () =>
      import('./pages/webauthn/webauthn-page.module').then(
        (m) => m.WebauthnPageModule
      )
  },
  {
    path: 'zen',
    loadChildren: () =>
      import('./pages/zen/zen-page.module').then((m) => m.ZenPageModule)
  },
  {
    // wildcard, if requested url doesn't match any paths for routes defined
    // earlier
    path: '**',
    redirectTo: 'home',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(
      routes,
      // Preload all lazy loaded modules with the attribute preload === true
      {
        anchorScrolling: 'enabled',
        preloadingStrategy: ModulePreloadService,
        // enableTracing: true // <-- debugging purposes only
        relativeLinkResolution: 'legacy'
      }
    )
  ],
  providers: [
    ModulePreloadService,
    { provide: TitleStrategy, useClass: PageTitleStrategy }
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
