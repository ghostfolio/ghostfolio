import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import {
  routes as ghostfolioRoutes,
  publicRoutes
} from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ResourcesPageComponent } from './resources-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ResourcesPageComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./overview/resources-overview.module').then(
            (m) => m.ResourcesOverviewModule
          )
      },
      {
        path: publicRoutes.resources.subRoutes.glossary.path,
        loadChildren: () =>
          import('./glossary/resources-glossary.module').then(
            (m) => m.ResourcesGlossaryPageModule
          )
      },
      {
        path: publicRoutes.resources.subRoutes.guides.path,
        loadChildren: () =>
          import('./guides/resources-guides.module').then(
            (m) => m.ResourcesGuidesModule
          )
      },
      {
        path: publicRoutes.resources.subRoutes.markets.path,
        loadChildren: () =>
          import('./markets/resources-markets.module').then(
            (m) => m.ResourcesMarketsModule
          )
      },
      ...[ghostfolioRoutes.personalFinanceTools].map((path) => ({
        path,
        loadChildren: () =>
          import(
            './personal-finance-tools/personal-finance-tools-page.module'
          ).then((m) => m.PersonalFinanceToolsPageModule)
      }))
    ],
    path: '',
    title: publicRoutes.resources.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesPageRoutingModule {}
