import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { MarketsPageComponent } from './markets-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: MarketsPageComponent,
    path: '',
    title: $localize`Markets`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MarketsPageRoutingModule {}
