import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { PageTitleStrategy } from '@ghostfolio/client/services/page-title.strategy';
import {
  publicRoutes,
  routes as ghostfolioRoutes,
  internalRoutes
} from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes, TitleStrategy } from '@angular/router';

import { ModulePreloadService } from './core/module-preload.service';

const routes: Routes = [
  {
    path: publicRoutes.about.path,
    loadChildren: () =>
      import('./pages/about/about-page.module').then((m) => m.AboutPageModule)
  },
  {
    path: internalRoutes.account.path,
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
    path: internalRoutes.adminControl.path,
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
    path: internalRoutes.auth.path,
    loadChildren: () =>
      import('./pages/auth/auth-page.module').then((m) => m.AuthPageModule),
    title: internalRoutes.auth.title
  },
  {
    path: publicRoutes.blog.path,
    loadChildren: () =>
      import('./pages/blog/blog-page.module').then((m) => m.BlogPageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/demo/demo-page.component').then(
        (c) => c.GfDemoPageComponent
      ),
    path: publicRoutes.demo.path
  },
  {
    path: publicRoutes.faq.path,
    loadChildren: () =>
      import('./pages/faq/faq-page.module').then((m) => m.FaqPageModule)
  },
  {
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/features/features-page.component').then(
        (c) => c.GfFeaturesPageComponent
      ),
    path: publicRoutes.features.path,
    title: publicRoutes.features.title
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
    path: publicRoutes.markets.path,
    loadChildren: () =>
      import('./pages/markets/markets-page.module').then(
        (m) => m.MarketsPageModule
      )
  },
  {
    path: publicRoutes.openStartup.path,
    loadChildren: () =>
      import('./pages/open/open-page.module').then((m) => m.OpenPageModule)
  },
  {
    path: internalRoutes.portfolio.path,
    loadChildren: () =>
      import('./pages/portfolio/portfolio-page.module').then(
        (m) => m.PortfolioPageModule
      )
  },
  {
    path: publicRoutes.pricing.path,
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
    path: publicRoutes.resources.path,
    loadChildren: () =>
      import('./pages/resources/resources-page.module').then(
        (m) => m.ResourcesPageModule
      )
  },
  {
    path: publicRoutes.start.path,
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
    path: internalRoutes.webauthn.path,
    title: internalRoutes.webauthn.title
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
