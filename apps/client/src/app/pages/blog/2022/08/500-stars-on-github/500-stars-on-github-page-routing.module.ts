import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { FiveHundredStarsOnGitHubPageComponent } from './500-stars-on-github-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: FiveHundredStarsOnGitHubPageComponent,
    path: '',
    title: '500 Stars on GitHub'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FiveHundredStarsOnGitHubRoutingModule {}
