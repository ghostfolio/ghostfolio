import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

import { XRayPageComponent } from './x-ray-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: XRayPageComponent,
    path: '',
    title: 'X-ray'
  }
];

@NgModule({
  imports: [IonIcon, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class XRayPageRoutingModule {}
