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
  ...[
    'about/changelog',
    /////
    'a-propos/changelog',
    'informazioni-su/changelog',
    'over/changelog',
    'sobre/changelog',
    'ueber-uns/changelog'
  ].map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/about/changelog/changelog-page.module').then(
        (m) => m.ChangelogPageModule
      )
  })),
  ...[
    'about/privacy-policy',
    /////
    'a-propos/politique-de-confidentialite',
    'informazioni-su/informativa-sulla-privacy',
    'over/privacybeleid',
    'sobre/politica-de-privacidad',
    'ueber-uns/datenschutzbestimmungen'
  ].map((path) => ({
    path,
    loadChildren: () =>
      import('./pages/about/privacy-policy/privacy-policy-page.module').then(
        (m) => m.PrivacyPolicyPageModule
      )
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
    path: 'blog/2022/11/black-friday-2022',
    loadChildren: () =>
      import(
        './pages/blog/2022/11/black-friday-2022/black-friday-2022-page.module'
      ).then((m) => m.BlackFriday2022PageModule)
  },
  {
    path: 'blog/2022/12/the-importance-of-tracking-your-personal-finances',
    loadChildren: () =>
      import(
        './pages/blog/2022/12/the-importance-of-tracking-your-personal-finances/the-importance-of-tracking-your-personal-finances-page.module'
      ).then((m) => m.TheImportanceOfTrackingYourPersonalFinancesPageModule)
  },
  {
    path: 'blog/2023/01/ghostfolio-auf-sackgeld-vorgestellt',
    loadChildren: () =>
      import(
        './pages/blog/2023/01/ghostfolio-auf-sackgeld-vorgestellt/ghostfolio-auf-sackgeld-vorgestellt-page.module'
      ).then((m) => m.GhostfolioAufSackgeldVorgestelltPageModule)
  },
  {
    path: 'blog/2023/02/ghostfolio-meets-umbrel',
    loadChildren: () =>
      import(
        './pages/blog/2023/02/ghostfolio-meets-umbrel/ghostfolio-meets-umbrel-page.module'
      ).then((m) => m.GhostfolioMeetsUmbrelPageModule)
  },
  {
    path: 'blog/2023/03/ghostfolio-reaches-1000-stars-on-github',
    loadChildren: () =>
      import(
        './pages/blog/2023/03/1000-stars-on-github/1000-stars-on-github-page.module'
      ).then((m) => m.ThousandStarsOnGitHubPageModule)
  },
  {
    path: 'blog/2023/05/unlock-your-financial-potential-with-ghostfolio',
    loadChildren: () =>
      import(
        './pages/blog/2023/05/unlock-your-financial-potential-with-ghostfolio/unlock-your-financial-potential-with-ghostfolio-page.module'
      ).then((m) => m.UnlockYourFinancialPotentialWithGhostfolioPageModule)
  },
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
