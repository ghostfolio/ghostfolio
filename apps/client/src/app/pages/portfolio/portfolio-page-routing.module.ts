import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { PortfolioPageComponent } from './portfolio-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: PortfolioPageComponent,
    path: '',
    title: 'Portfolio'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PortfolioPageRoutingModule {}
