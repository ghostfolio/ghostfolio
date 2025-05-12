import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { paths } from '@ghostfolio/client/core/paths';
import { PageTitleStrategy } from '@ghostfolio/client/services/page-title.strategy';

import { NgModule } from '@angular/core';
import { RouterModule, Routes, TitleStrategy } from '@angular/router';

import { ModulePreloadService } from './core/module-preload.service';

const routes: Routes = [
  {
    path: paths.about,
    loadChildren: () =>
      import('./pages/about/about-page.module').then((m) => m.AboutPageModule)
  },
  {
    path: paths.account,
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
    path: paths.admin,
    loadChildren: () =>
      import('./pages/admin/admin-page.module').then((m) => m.AdminPageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/api/api-page.component').then(
        (c) => c.GfApiPageComponent
      ),
    path: 'api',
    title: 'Ghostfolio API'
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
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/demo/demo-page.component').then(
        (c) => c.GfDemoPageComponent
      ),
    path: 'demo'
  },
  {
    path: paths.faq,
    loadChildren: () =>
      import('./pages/faq/faq-page.module').then((m) => m.FaqPageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/features/features-page.component').then(
        (c) => c.GfFeaturesPageComponent
      ),
    path: paths.features,
    title: $localize`Features`
  },
  {
    path: 'home',
    loadChildren: () =>
      import('./pages/home/home-page.module').then((m) => m.HomePageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/i18n/i18n-page.component').then(
        (c) => c.GfI18nPageComponent
      ),
    path: 'i18n',
    title: $localize`Internationalization`
  },
  {
    path: paths.markets,
    loadChildren: () =>
      import('./pages/markets/markets-page.module').then(
        (m) => m.MarketsPageModule
      )
  },
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
    path: paths.portfolio,
    loadChildren: () =>
      import('./pages/portfolio/portfolio-page.module').then(
        (m) => m.PortfolioPageModule
      )
  },
  {
    path: paths.pricing,
    loadChildren: () =>
      import('./pages/pricing/pricing-page.module').then(
        (m) => m.PricingPageModule
      )
  },
  {
    path: paths.register,
    loadChildren: () =>
      import('./pages/register/register-page.module').then(
        (m) => m.RegisterPageModule
      )
  },
  {
    path: paths.resources,
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
    loadComponent: () =>
      import('./pages/webauthn/webauthn-page.component').then(
        (c) => c.GfWebauthnPageComponent
      ),
    path: 'webauthn',
    title: $localize`Sign in`
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
