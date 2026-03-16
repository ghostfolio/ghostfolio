import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfEntitiesPageComponent } from './entities-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfEntitiesPageComponent,
    path: '',
    title: 'Entities'
  }
];
