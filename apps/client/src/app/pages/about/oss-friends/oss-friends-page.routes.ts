import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Routes } from '@angular/router';

import { AuthGuard } from '../../../core/auth.guard';
import { GfOpenSourceSoftwareFriendsPageComponent } from './oss-friends-page.component';

export const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GfOpenSourceSoftwareFriendsPageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.ossFriends.title
  }
];
