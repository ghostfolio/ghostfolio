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
    path: 'analysis',
    loadChildren: () =>
      import('./pages/analysis/analysis-page.module').then(
        (m) => m.AnalysisPageModule
      )
  },
  {
    path: 'home',
    loadChildren: () =>
      import('./pages/home/home-page.module').then((m) => m.HomePageModule)
  },
  {
    path: 'report',
    loadChildren: () =>
      import('./pages/report/report-page.module').then(
        (m) => m.ReportPageModule
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
      import('./pages/login/login-page.module').then((m) => m.LoginPageModule)
  },
  {
    path: 'transactions',
    loadChildren: () =>
      import('./pages/transactions/transactions-page.module').then(
        (m) => m.TransactionsPageModule
      )
  },
  {
    // wildcard, if requested url doesn't match any paths for routes defined
    // earlier
    path: '**',
    redirectTo: '/home',
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
