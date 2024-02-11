import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AllocationsPageComponent } from './allocations-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AllocationsPageComponent,
    path: '',
    title: $localize`Allocations`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AllocationsPageRoutingModule {}
