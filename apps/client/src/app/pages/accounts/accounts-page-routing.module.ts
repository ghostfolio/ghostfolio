import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AccountsPageComponent } from './accounts-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AccountsPageComponent,
    path: '',
    title: $localize`Accounts`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountsPageRoutingModule {}
