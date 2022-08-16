import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { PublicPageComponent } from './public-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: PublicPageComponent,
    path: ':id',
    title: $localize`Portfolio`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicPageRoutingModule {}
