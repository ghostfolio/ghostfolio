import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { ChangelogPageComponent } from './changelog-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ChangelogPageComponent,
    path: '',
    title: $localize`Changelog & License`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChangelogPageRoutingModule {}
