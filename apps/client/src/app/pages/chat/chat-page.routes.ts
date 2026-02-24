import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { internalRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { GfChatPageComponent } from './chat-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfChatPageComponent,
    path: '',
    title: internalRoutes.chat.title
  }
];
