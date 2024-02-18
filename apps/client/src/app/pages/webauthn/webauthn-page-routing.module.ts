import { WebauthnPageComponent } from '@ghostfolio/client/pages/webauthn/webauthn-page.component';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { component: WebauthnPageComponent, path: '', title: $localize`Sign in` }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WebauthnPageRoutingModule {}
