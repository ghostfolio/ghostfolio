import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { AlternativesPageComponent } from './alternatives-page.component';
import { data } from './data';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AlternativesPageComponent,
    path: '',
    title: $localize`Alternatives`
  },
  {
    canActivate: [AuthGuard],
    path: 'maybe',
    loadComponent: () =>
      import('./products/maybe-page.component').then(
        (c) => c.MaybePageComponent
      ),
    title: data.find(({ key }) => key === 'maybe').name
  },
  {
    canActivate: [AuthGuard],
    path: 'parqet',
    loadComponent: () =>
      import('./products/parqet-page.component').then(
        (c) => c.ParqetPageComponent
      ),
    title: data.find(({ key }) => key === 'parqet').name
  },
  {
    canActivate: [AuthGuard],
    path: 'yeekatee',
    loadComponent: () =>
      import('./products/yeekatee-page.component').then(
        (c) => c.YeekateePageComponent
      ),
    title: data.find(({ key }) => key === 'yeekatee').name
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AlternativesPageRoutingModule {}
