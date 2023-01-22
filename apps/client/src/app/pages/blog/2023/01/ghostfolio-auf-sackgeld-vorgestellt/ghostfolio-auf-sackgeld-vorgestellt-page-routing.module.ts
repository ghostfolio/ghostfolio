import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { GhostfolioAufSackgeldVorgestelltPageComponent } from './ghostfolio-auf-sackgeld-vorgestellt-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: GhostfolioAufSackgeldVorgestelltPageComponent,
    path: '',
    title: 'Ghostfolio auf Sackgeld.com vorgestellt'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GhostfolioAufSackgeldVorgestelltPageRoutingModule {}
