import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AnalysisPageComponent } from './analysis-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AnalysisPageComponent,
    path: '',
    title: internalRoutes.portfolio.subRoutes.analysis.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AnalysisPageRoutingModule {}
