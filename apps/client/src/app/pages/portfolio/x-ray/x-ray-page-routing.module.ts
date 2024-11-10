import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { XRayPageComponent } from './x-ray-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: XRayPageComponent,
    path: '',
    title: $localize`X-ray`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class XRayPageRoutingModule {}
