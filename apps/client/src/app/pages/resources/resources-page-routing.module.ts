import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// import { ResourcesGlossaryPageComponent } from './glossary/resources-glossary.component';
// import { ResourcesGuidesComponent } from './guides/resources-guides.component';
// import { ResourcesMarketsComponent } from './markets/resources-markets.component';
// import { ResourcesOverviewComponent } from './overview/resources-overview.component';
import { ResourcesPageComponent } from './resources-page.component';

const routes: Routes = [
  {
    path: '',
    component: ResourcesPageComponent,
    canActivate: [AuthGuard],
    children: [
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
      },
      {
        path: '',
        loadChildren: () =>
          import('./overview/resources-overview.module').then(
            (m) => m.ResourcesOverviewModule
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
