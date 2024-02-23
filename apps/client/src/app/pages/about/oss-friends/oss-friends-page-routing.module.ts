import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OpenSourceSoftwareFriendsPageComponent } from './oss-friends-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: OpenSourceSoftwareFriendsPageComponent,
    path: '',
    title: 'OSS Friends'
  }
];

@NgModule({
  exports: [RouterModule],
  imports: [RouterModule.forChild(routes)]
})
export class OpenSourceSoftwareFriendsPageRoutingModule {}
