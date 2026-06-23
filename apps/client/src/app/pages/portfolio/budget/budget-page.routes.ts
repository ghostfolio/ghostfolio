import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfBudgetPageComponent } from './budget-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfBudgetPageComponent,
    path: '',
    title: internalRoutes.portfolio.subRoutes.budget.title
  }
];
