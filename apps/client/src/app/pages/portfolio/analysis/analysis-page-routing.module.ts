import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AnalysisPageComponent } from './analysis-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AnalysisPageComponent,
    path: '',
    title: $localize`Analysis`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AnalysisPageRoutingModule {}
