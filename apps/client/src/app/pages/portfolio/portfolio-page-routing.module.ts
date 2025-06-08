import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import {
  routes as ghostfolioRoutes,
  internalRoutes
} from '@ghostfolio/common/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PortfolioPageComponent } from './portfolio-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./analysis/analysis-page.module').then(
            (m) => m.AnalysisPageModule
          )
      },
      {
        path: ghostfolioRoutes.activities,
        loadChildren: () =>
          import('./activities/activities-page.module').then(
            (m) => m.ActivitiesPageModule
          )
      },
      {
        path: ghostfolioRoutes.allocations,
        loadChildren: () =>
          import('./allocations/allocations-page.module').then(
            (m) => m.AllocationsPageModule
          )
      },
      {
        path: ghostfolioRoutes.fire,
        loadChildren: () =>
          import('./fire/fire-page.module').then((m) => m.FirePageModule)
      },
      {
        path: ghostfolioRoutes.xRay,
        loadChildren: () =>
          import('./x-ray/x-ray-page.module').then((m) => m.XRayPageModule)
      }
    ],
    component: PortfolioPageComponent,
    path: '',
    title: internalRoutes.portfolio.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortfolioPageRoutingModule {}
