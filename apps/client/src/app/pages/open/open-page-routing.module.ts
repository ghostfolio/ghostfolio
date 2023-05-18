import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { OpenPageComponent } from './open-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: OpenPageComponent,
    path: '',
    title: 'Open Startup'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OpenPageRoutingModule {}
