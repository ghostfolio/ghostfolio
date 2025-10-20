import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { ResourcesGlossaryPageComponent } from './resources-glossary.component';

export const routes: Routes = [
  {
    component: ResourcesGlossaryPageComponent,
    path: '',
    title: publicRoutes.resources.subRoutes.glossary.title
  }
];
