import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { TransactionsPageComponent } from './transactions-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: TransactionsPageComponent,
    path: '',
    title: $localize`Activities`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TransactionsPageRoutingModule {}
