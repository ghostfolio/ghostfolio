import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WebauthnPageComponent } from '@ghostfolio/client/pages/webauthn/webauthn-page.component';

const routes: Routes = [{ path: '', component: WebauthnPageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WebauthnPageRoutingModule {}
