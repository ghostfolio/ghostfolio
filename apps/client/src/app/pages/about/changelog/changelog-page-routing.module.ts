import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ChangelogPageComponent } from './changelog-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ChangelogPageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.changelog.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChangelogPageRoutingModule {}
