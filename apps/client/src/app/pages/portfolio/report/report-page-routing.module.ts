import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { ReportPageComponent } from './report-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: ReportPageComponent,
    path: '',
    title: 'X-ray'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportPageRoutingModule {}
