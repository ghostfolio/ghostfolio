import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfAnalysisPageComponent } from './analysis-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfAnalysisPageComponent,
    path: '',
    title: internalRoutes.portfolio.subRoutes.analysis.title
  }
];
