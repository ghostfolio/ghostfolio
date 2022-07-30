import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { HalloGhostfolioPageComponent } from './hallo-ghostfolio-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: HalloGhostfolioPageComponent,
    path: '',
    title: 'Hallo Ghostfolio'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HalloGhostfolioPageRoutingModule {}
