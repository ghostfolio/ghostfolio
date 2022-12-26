import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { TheImportanceOfTrackingYourPersonalFinancesPageComponent } from './the-importance-of-tracking-your-personal-finances-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: TheImportanceOfTrackingYourPersonalFinancesPageComponent,
    path: '',
    title: 'The importance of tracking your personal finances'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TheImportanceOfTrackingYourPersonalFinancesRoutingModule {}
