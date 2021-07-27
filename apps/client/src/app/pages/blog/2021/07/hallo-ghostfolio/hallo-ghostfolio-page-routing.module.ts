import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { HalloGhostfolioPageComponent } from './hallo-ghostfolio-page.component';

const routes: Routes = [
  {
    path: '',
    component: HalloGhostfolioPageComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HalloGhostfolioPageRoutingModule {}
