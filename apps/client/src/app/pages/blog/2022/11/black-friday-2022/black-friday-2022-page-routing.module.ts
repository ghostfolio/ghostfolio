import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { BlackFriday2022PageComponent } from './black-friday-2022-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: BlackFriday2022PageComponent,
    path: '',
    title: 'Black Friday 2022'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BlackFriday2022RoutingModule {}
