import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OpenPageComponent } from './open-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: OpenPageComponent,
    path: '',
    title: publicRoutes.openStartup.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OpenPageRoutingModule {}
