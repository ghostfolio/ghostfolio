import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfAnalysisPageComponent } from './analysis-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfAnalysisPageComponent,
    path: '',
    title: internalRoutes.portfolio.subRoutes.analysis.title
  }
];
