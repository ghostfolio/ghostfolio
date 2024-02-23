import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ResourcesPageComponent } from './resources-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ResourcesPageComponent,
    path: '',
    title: $localize`Resources`
  },
  ...['personal-finance-tools'].map((path) => ({
    path,
    loadChildren: () =>
      import(
        './personal-finance-tools/personal-finance-tools-page.module'
      ).then((m) => m.PersonalFinanceToolsPageModule)
  }))
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesPageRoutingModule {}
