import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { FirstMonthsInOpenSourcePageComponent } from './first-months-in-open-source-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: FirstMonthsInOpenSourcePageComponent,
    path: '',
    title: 'First months in Open Source'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FirstMonthsInOpenSourceRoutingModule {}
