import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { OpenSourceSoftwareFriendsPageComponent } from './oss-friends-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: OpenSourceSoftwareFriendsPageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.ossFriends.title
  }
];
