import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PersonalFinanceToolsPageComponent } from './personal-finance-tools-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: PersonalFinanceToolsPageComponent,
    path: '',
    title: publicRoutes.resources.subRoutes.personalFinanceTools.title
  },
  ...personalFinanceTools.map(({ alias, key, name }) => {
    return {
      canActivate: [AuthGuard],
      data: { key },
      loadComponent: () =>
        import('./product-page.component').then(
          ({ GfProductPageComponent }) => {
            return GfProductPageComponent;
          }
        ),
      path: `${publicRoutes.resources.subRoutes.personalFinanceTools.subRoutes.product.path}-${alias ?? key}`,
      title: `${publicRoutes.resources.subRoutes.personalFinanceTools.subRoutes.product.title} ${name}`
    };
  })
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PersonalFinanceToolsPageRoutingModule {}
