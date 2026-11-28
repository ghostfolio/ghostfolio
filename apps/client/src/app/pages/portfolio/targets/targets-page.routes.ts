import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Routes } from '@angular/router';

import { GfTargetsPageComponent } from './targets-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfTargetsPageComponent,
    path: '',
    title: $localize`Targets`
  }
];
