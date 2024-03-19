import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ChangelogPageComponent } from './changelog-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ChangelogPageComponent,
    path: '',
    title: $localize`Changelog`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChangelogPageRoutingModule {}
