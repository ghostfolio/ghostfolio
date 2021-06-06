import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ModulePreloadService } from './core/module-preload.service';

const routes: Routes = [
  {
    path: 'about',
    loadChildren: () =>
      import('./pages/about/about-page.module').then((m) => m.AboutPageModule)
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
    path: 'home',
    loadChildren: () =>
      import('./pages/home/home-page.module').then((m) => m.HomePageModule)
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
    path: 'tools',
    loadChildren: () =>
      import('./pages/tools/tools-page.module').then((m) => m.ToolsPageModule)
  },
  {
    path: 'tools/analysis',
    loadChildren: () =>
      import('./pages/tools/analysis/analysis-page.module').then(
        (m) => m.AnalysisPageModule
      )
  },
  {
    path: 'tools/report',
    loadChildren: () =>
      import('./pages/tools/report/report-page.module').then(
        (m) => m.ReportPageModule
      )
  },
  {
    path: 'transactions',
    loadChildren: () =>
      import('./pages/transactions/transactions-page.module').then(
        (m) => m.TransactionsPageModule
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
        preloadingStrategy: ModulePreloadService,
        // enableTracing: true // <-- debugging purposes only
        relativeLinkResolution: 'legacy'
      }
    )
  ],
  providers: [ModulePreloadService],
  exports: [RouterModule]
})
export class AppRoutingModule {}
