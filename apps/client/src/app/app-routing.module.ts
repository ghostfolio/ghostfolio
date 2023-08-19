import { NgModule } from '@angular/core';
import { RouterModule, Routes, TitleStrategy } from '@angular/router';
import { routes as aboutRoutes } from '@ghostfolio/client/pages/about/routes';
import { routes as faqRoutes } from '@ghostfolio/client/pages/faq/routes';
import { routes as featuresRoutes } from '@ghostfolio/client/pages/features/routes';
import { routes as marketsRoutes } from '@ghostfolio/client/pages/markets/routes';
import { routes as pricingRoutes } from '@ghostfolio/client/pages/pricing/routes';
import { routes as registerRoutes } from '@ghostfolio/client/pages/register/routes';
import { routes as resourcesRoutes } from '@ghostfolio/client/pages/resources/routes';
import { PageTitleStrategy } from '@ghostfolio/client/services/page-title.strategy';

import { ModulePreloadService } from './core/module-preload.service';

const routes: Routes = [
  ...aboutRoutes.map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/about/about-page.module').then((m) => m.AboutPageModule)
  })),
  {
    path: 'account',
    loadChildren: () =>
      import('./pages/user-account/user-account-page.module').then(
        (m) => m.UserAccountPageModule
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
    path: 'demo',
    loadChildren: () =>
      import('./pages/demo/demo-page.module').then((m) => m.DemoPageModule)
  },
  ...faqRoutes.map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/faq/faq-page.module').then((m) => m.FaqPageModule)
  })),
  ...featuresRoutes.map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/features/features-page.module').then(
        (m) => m.FeaturesPageModule
      )
  })),
  {
    path: 'home',
    loadChildren: () =>
      import('./pages/home/home-page.module').then((m) => m.HomePageModule)
  },
  ...marketsRoutes.map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/markets/markets-page.module').then(
        (m) => m.MarketsPageModule
      )
  })),
  {
    path: 'open',
    loadChildren: () =>
      import('./pages/open/open-page.module').then((m) => m.OpenPageModule)
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
  ...pricingRoutes.map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/pricing/pricing-page.module').then(
        (m) => m.PricingPageModule
      )
  })),
  ...registerRoutes.map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/register/register-page.module').then(
        (m) => m.RegisterPageModule
      )
  })),
  ...resourcesRoutes.map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/resources/resources-page.module').then(
        (m) => m.ResourcesPageModule
      )
  })),
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
        preloadingStrategy: ModulePreloadService
        // enableTracing: true // <-- debugging purposes only
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
