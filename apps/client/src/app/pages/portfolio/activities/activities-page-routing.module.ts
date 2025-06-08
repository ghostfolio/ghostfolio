import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ActivitiesPageComponent } from './activities-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ActivitiesPageComponent,
    path: '',
    title: internalRoutes.portfolio.subRoutes.activities.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ActivitiesPageRoutingModule {}
