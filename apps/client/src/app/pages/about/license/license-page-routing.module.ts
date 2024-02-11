import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LicensePageComponent } from './license-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: LicensePageComponent,
    path: '',
    title: $localize`License`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LicensePageRoutingModule {}
