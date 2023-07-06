import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { AlternativesPageComponent } from './alternatives-page.component';
import { products } from './products';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AlternativesPageComponent,
    path: '',
    title: $localize`Alternatives`
  },
  ...products
    .filter(({ key }) => {
      return key !== 'ghostfolio';
    })
    .map(({ component, key, name }) => {
      return {
        canActivate: [AuthGuard],
        path: key,
        loadComponent: () =>
          import(`./products/${key}-page.component`).then(() => component),
        title: `Open Source Alternative to ${name}`
      };
    })
  /*{
    canActivate: [AuthGuard],
    path: 'maybe',
    loadComponent: () =>
      import('./products/maybe-page.component').then(
        (c) => c.MaybePageComponent
      ),
    title: products.find(({ key }) => key === 'maybe').name
  },
  {
    canActivate: [AuthGuard],
    path: 'parqet',
    loadComponent: () =>
      import('./products/parqet-page.component').then(
        (c) => c.ParqetPageComponent
      ),
    title: products.find(({ key }) => key === 'parqet').name
  },
  {
    canActivate: [AuthGuard],
    path: 'yeekatee',
    loadComponent: () =>
      import('./products/yeekatee-page.component').then(
        (c) => c.YeekateePageComponent
      ),
    title: products.find(({ key }) => key === 'yeekatee').name
  }*/
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AlternativesPageRoutingModule {}
