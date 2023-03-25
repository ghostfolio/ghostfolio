import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { ThousandStarsOnGitHubPageComponent } from './1000-stars-on-github-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ThousandStarsOnGitHubPageComponent,
    path: '',
    title: 'Ghostfolio reaches 1’000 Stars on GitHub'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ThousandStarsOnGitHubRoutingModule {}
