import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { paths } from '@ghostfolio/client/core/paths';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PersonalFinanceToolsPageComponent } from './personal-finance-tools-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: PersonalFinanceToolsPageComponent,
    path: '',
    title: $localize`Personal Finance Tools`
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
      path: paths.openSourceAlternativeTo + `-${alias ?? key}`,
      title: $localize`Open Source Alternative to ${name}`
    };
  })
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PersonalFinanceToolsPageRoutingModule {}
