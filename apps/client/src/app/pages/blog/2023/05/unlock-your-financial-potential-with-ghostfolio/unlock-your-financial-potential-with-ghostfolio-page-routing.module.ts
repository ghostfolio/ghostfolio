import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { UnlockYourFinancialPotentialWithGhostfolioPageComponent } from './unlock-your-financial-potential-with-ghostfolio-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: UnlockYourFinancialPotentialWithGhostfolioPageComponent,
    path: '',
    title: 'Unlock your Financial Potential with Ghostfolio'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UnlockYourFinancialPotentialWithGhostfolioRoutingModule {}
