import { NgModule } from '@angular/core';
import { RouterModule, Routes, TitleStrategy } from '@angular/router';
import { PageTitleStrategy } from '@ghostfolio/client/services/page-title.strategy';

import { ModulePreloadService } from './core/module-preload.service';

const routes: Routes = [
  ...[
    'about',
    /////
    'a-propos',
    'informazioni-su',
    'over',
    'sobre',
    'ueber-uns'
  ].map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/about/about-page.module').then((m) => m.AboutPageModule)
  })),
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
  ...['blog'].map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/blog/blog-page.module').then((m) => m.BlogPageModule)
  })),
  {
    path: 'demo',
    loadChildren: () =>
      import('./pages/demo/demo-page.module').then((m) => m.DemoPageModule)
  },
  ...[
    'faq',
    /////
    'domande-piu-frequenti',
    'foire-aux-questions',
    'haeufig-gestellte-fragen',
    'perguntas-mais-frequentes',
    'preguntas-mas-frecuentes',
    'vaak-gestelde-vragen'
  ].map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/faq/faq-page.module').then((m) => m.FaqPageModule)
  })),
  ...[
    'features',
    /////
    'fonctionnalites',
    'funcionalidades',
    'funzionalita',
    'kenmerken'
  ].map((path) => ({
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
  ...[
    'markets',
    /////
    'maerkte',
    'marches',
    'markten',
    'mercados',
    'mercati'
  ].map((path) => ({
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
  ...[
    'pricing',
    /////
    'precios',
    'precos',
    'preise',
    'prezzi',
    'prijzen',
    'prix'
  ].map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/pricing/pricing-page.module').then(
        (m) => m.PricingPageModule
      )
  })),
  ...[
    'register',
    /////
    'enregistrement',
    'iscrizione',
    'registo',
    'registratie',
    'registrierung',
    'registro'
  ].map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/register/register-page.module').then(
        (m) => m.RegisterPageModule
      )
  })),
  ...[
    'resources',
    /////
    'bronnen',
    'recursos',
    'ressourcen',
    'ressources',
    'risorse'
  ].map((path) => ({
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
