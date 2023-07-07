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
        path: `open-source-alternative-to-${key}`,
        loadComponent: () =>
          import(`./products/${key}-page.component`).then(() => component),
        title: `Open Source Alternative to ${name}`
      };
    })
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AlternativesPageRoutingModule {}
