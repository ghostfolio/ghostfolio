import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { FirePageComponent } from './fire-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: FirePageComponent,
    path: '',
    title: 'FIRE'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FirePageRoutingModule {}
