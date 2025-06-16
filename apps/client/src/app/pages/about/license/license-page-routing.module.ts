import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LicensePageComponent } from './license-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: LicensePageComponent,
    path: '',
    title: publicRoutes.about.subRoutes.license.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LicensePageRoutingModule {}
