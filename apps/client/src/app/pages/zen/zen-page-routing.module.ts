import { HomeHoldingsComponent } from '@ghostfolio/client/components/home-holdings/home-holdings.component';
import { HomeOverviewComponent } from '@ghostfolio/client/components/home-overview/home-overview.component';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ZenPageComponent } from './zen-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    children: [
      { path: '', component: HomeOverviewComponent },
      { path: 'holdings', component: HomeHoldingsComponent }
    ],
    component: ZenPageComponent,
    path: '',
    title: $localize`Overview`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ZenPageRoutingModule {}
