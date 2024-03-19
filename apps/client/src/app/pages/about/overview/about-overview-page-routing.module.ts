import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AboutOverviewPageComponent } from './about-overview-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AboutOverviewPageComponent,
    path: '',
    title: $localize`About`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AboutOverviewPageRoutingModule {}
