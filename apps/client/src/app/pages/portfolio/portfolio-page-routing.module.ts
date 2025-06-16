import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

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
        path: internalRoutes.portfolio.subRoutes.activities.path,
        loadChildren: () =>
          import('./activities/activities-page.module').then(
            (m) => m.ActivitiesPageModule
          )
      },
      {
        path: internalRoutes.portfolio.subRoutes.allocations.path,
        loadChildren: () =>
          import('./allocations/allocations-page.module').then(
            (m) => m.AllocationsPageModule
          )
      },
      {
        path: internalRoutes.portfolio.subRoutes.fire.path,
        loadChildren: () =>
          import('./fire/fire-page.module').then((m) => m.FirePageModule)
      },
      {
        path: internalRoutes.portfolio.subRoutes.xRay.path,
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
