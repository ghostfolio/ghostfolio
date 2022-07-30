import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { HelloGhostfolioPageComponent } from './hello-ghostfolio-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: HelloGhostfolioPageComponent,
    path: '',
    title: 'Hello Ghostfolio'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HelloGhostfolioPageRoutingModule {}
