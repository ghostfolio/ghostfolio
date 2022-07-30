import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { HowDoIGetMyFinancesInOrderPageComponent } from './how-do-i-get-my-finances-in-order-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: HowDoIGetMyFinancesInOrderPageComponent,
    path: '',
    title: 'How do I get my finances in order?'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HowDoIGetMyFinancesInOrderRoutingModule {}
