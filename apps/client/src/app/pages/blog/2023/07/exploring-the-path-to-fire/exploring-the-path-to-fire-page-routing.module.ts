import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { ExploringThePathToFirePageComponent } from './exploring-the-path-to-fire-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ExploringThePathToFirePageComponent,
    path: '',
    title: 'Exploring the Path to FIRE'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExploringThePathToFireRoutingModule {}
