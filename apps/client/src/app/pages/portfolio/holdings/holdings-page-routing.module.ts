import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HoldingsPageComponent } from './holdings-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: HoldingsPageComponent,
    path: '',
    title: $localize`Holdings`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HoldingsPageRoutingModule {}
