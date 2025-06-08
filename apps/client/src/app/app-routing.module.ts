import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { PageTitleStrategy } from '@ghostfolio/client/services/page-title.strategy';
import {
  publicRoutes,
  routes as ghostfolioRoutes,
  internalRoutes
} from '@ghostfolio/common/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes, TitleStrategy } from '@angular/router';

import { ModulePreloadService } from './core/module-preload.service';

const routes: Routes = [
  {
    path: ghostfolioRoutes.about,
    loadChildren: () =>
      import('./pages/about/about-page.module').then((m) => m.AboutPageModule)
  },
  {
    path: ghostfolioRoutes.account,
    loadChildren: () =>
      import('./pages/user-account/user-account-page.module').then(
        (m) => m.UserAccountPageModule
      )
  },
  {
    path: internalRoutes.accounts.path,
    loadChildren: () =>
      import('./pages/accounts/accounts-page.module').then(
        (m) => m.AccountsPageModule
      )
  },
  {
    path: ghostfolioRoutes.adminControl,
    loadChildren: () =>
      import('./pages/admin/admin-page.module').then((m) => m.AdminPageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/api/api-page.component').then(
        (c) => c.GfApiPageComponent
      ),
    path: ghostfolioRoutes.api,
    title: 'Ghostfolio API'
  },
  {
    path: ghostfolioRoutes.auth,
    loadChildren: () =>
      import('./pages/auth/auth-page.module').then((m) => m.AuthPageModule)
  },
  {
    path: ghostfolioRoutes.blog,
    loadChildren: () =>
      import('./pages/blog/blog-page.module').then((m) => m.BlogPageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/demo/demo-page.component').then(
        (c) => c.GfDemoPageComponent
      ),
    path: ghostfolioRoutes.demo
  },
  {
    path: ghostfolioRoutes.faq,
    loadChildren: () =>
      import('./pages/faq/faq-page.module').then((m) => m.FaqPageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/features/features-page.component').then(
        (c) => c.GfFeaturesPageComponent
      ),
    path: ghostfolioRoutes.features,
    title: $localize`Features`
  },
  {
    path: internalRoutes.home.path,
    loadChildren: () =>
      import('./pages/home/home-page.module').then((m) => m.HomePageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/i18n/i18n-page.component').then(
        (c) => c.GfI18nPageComponent
      ),
    path: ghostfolioRoutes.i18n,
    title: $localize`Internationalization`
  },
  {
    path: ghostfolioRoutes.markets,
    loadChildren: () =>
      import('./pages/markets/markets-page.module').then(
        (m) => m.MarketsPageModule
      )
  },
  {
    path: ghostfolioRoutes.openStartup,
    loadChildren: () =>
      import('./pages/open/open-page.module').then((m) => m.OpenPageModule)
  },
  {
    path: ghostfolioRoutes.portfolio,
    loadChildren: () =>
      import('./pages/portfolio/portfolio-page.module').then(
        (m) => m.PortfolioPageModule
      )
  },
  {
    path: ghostfolioRoutes.pricing,
    loadChildren: () =>
      import('./pages/pricing/pricing-page.module').then(
        (m) => m.PricingPageModule
      )
  },
  {
    path: ghostfolioRoutes.public,
    loadChildren: () =>
      import('./pages/public/public-page.module').then(
        (m) => m.PublicPageModule
      )
  },
  {
    path: publicRoutes.register.path,
    loadChildren: () =>
      import('./pages/register/register-page.module').then(
        (m) => m.RegisterPageModule
      )
  },
  {
    path: ghostfolioRoutes.resources,
    loadChildren: () =>
      import('./pages/resources/resources-page.module').then(
        (m) => m.ResourcesPageModule
      )
  },
  {
    path: ghostfolioRoutes.start,
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
    path: ghostfolioRoutes.webauthn,
    title: $localize`Sign in`
  },
  {
    path: internalRoutes.zen.path,
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
