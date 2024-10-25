import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ResourcesPageComponent } from './resources-page.component';

const routes: Routes = [
  {
    path: '',
    component: ResourcesPageComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./overview/resources-overview.module').then(
            (m) => m.ResourcesOverviewModule
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
      },
      {
        path: 'glossary',
        loadChildren: () =>
          import('./glossary/resources-glossary.module').then(
            (m) => m.ResourcesGlossaryPageModule
          )
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesPageRoutingModule {}
