import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { Hacktoberfest2022PageComponent } from './hacktoberfest-2022-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: Hacktoberfest2022PageComponent,
    path: '',
    title: 'Hacktoberfest 2022'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Hacktoberfest2022RoutingModule {}
