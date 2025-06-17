import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OpenSourceSoftwareFriendsPageComponent } from './oss-friends-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: OpenSourceSoftwareFriendsPageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.ossFriends.title
  }
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)]
})
export class OpenSourceSoftwareFriendsPageRoutingModule {}
