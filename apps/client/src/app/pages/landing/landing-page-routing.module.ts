import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LandingPageComponent } from './landing-page.component';

const routes: Routes = [
  { path: '', component: LandingPageComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LandingPageRoutingModule {}
