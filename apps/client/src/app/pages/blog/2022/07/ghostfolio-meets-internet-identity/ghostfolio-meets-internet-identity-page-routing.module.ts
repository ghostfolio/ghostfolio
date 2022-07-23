import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { GhostfolioMeetsInternetIdentityPageComponent } from './ghostfolio-meets-internet-identity-page.component';

const routes: Routes = [
  {
    path: '',
    component: GhostfolioMeetsInternetIdentityPageComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GhostfolioMeetsInternetIdentityRoutingModule {}
