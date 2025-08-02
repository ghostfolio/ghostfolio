import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { ResourcesMarketsComponent } from './resources-markets.component';

export const routes: Routes = [
  {
    component: ResourcesMarketsComponent,
    path: '',
    title: publicRoutes.resources.subRoutes.markets.title
  }
];
