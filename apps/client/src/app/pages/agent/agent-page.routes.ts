import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfAgentPageComponent } from './agent-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfAgentPageComponent,
    path: '',
    title: internalRoutes.agent.title
  }
];
