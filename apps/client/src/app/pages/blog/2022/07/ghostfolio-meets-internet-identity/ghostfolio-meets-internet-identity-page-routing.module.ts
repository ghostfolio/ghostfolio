import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { GhostfolioMeetsInternetIdentityPageComponent } from './ghostfolio-meets-internet-identity-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GhostfolioMeetsInternetIdentityPageComponent,
    path: '',
    title: 'Ghostfolio meets Internet Identity'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GhostfolioMeetsInternetIdentityRoutingModule {}
