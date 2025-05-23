import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { PageTitleStrategy } from '@ghostfolio/client/services/page-title.strategy';
import { paths } from '@ghostfolio/common/paths';

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
    path: paths.accounts,
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
    path: paths.api,
    title: 'Ghostfolio API'
  },
  {
    path: paths.auth,
    loadChildren: () =>
      import('./pages/auth/auth-page.module').then((m) => m.AuthPageModule)
  },
  {
    path: paths.blog,
    loadChildren: () =>
      import('./pages/blog/blog-page.module').then((m) => m.BlogPageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/demo/demo-page.component').then(
        (c) => c.GfDemoPageComponent
      ),
    path: paths.demo
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
    path: paths.home,
    loadChildren: () =>
      import('./pages/home/home-page.module').then((m) => m.HomePageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/i18n/i18n-page.component').then(
        (c) => c.GfI18nPageComponent
      ),
    path: paths.i18n,
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
    path: paths.open,
    loadChildren: () =>
      import('./pages/open/open-page.module').then((m) => m.OpenPageModule)
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
    path: paths.public,
    loadChildren: () =>
      import('./pages/public/public-page.module').then(
        (m) => m.PublicPageModule
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
    path: paths.start,
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
    path: paths.webauthn,
    title: $localize`Sign in`
  },
  {
    path: paths.zen,
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
