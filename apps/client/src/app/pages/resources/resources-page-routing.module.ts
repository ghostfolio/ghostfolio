import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

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
        path: 'glossary',
        loadChildren: () =>
          import('./glossary/resources-glossary.module').then(
            (m) => m.ResourcesGlossaryPageModule
          )
      },
      {
        path: 'guides',
        loadChildren: () =>
          import('./guides/resources-guides.module').then(
            (m) => m.ResourcesGuidesModule
          )
      },
      {
        path: 'markets',
        loadChildren: () =>
          import('./markets/resources-markets.module').then(
            (m) => m.ResourcesMarketsModule
          )
      }
    ],
    path: ''
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesPageRoutingModule {}
