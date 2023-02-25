import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { GhostfolioMeetsUmbrelPageComponent } from './ghostfolio-meets-umbrel-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GhostfolioMeetsUmbrelPageComponent,
    path: '',
    title: 'Ghostfolio meets Umbrel'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GhostfolioMeetsUmbrelPageRoutingModule {}
