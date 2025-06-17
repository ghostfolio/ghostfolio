import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ResourcesMarketsComponent } from './resources-markets.component';

const routes: Routes = [
  {
    component: ResourcesMarketsComponent,
    path: '',
    title: publicRoutes.resources.subRoutes.markets.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesMarketsRoutingModule {}
