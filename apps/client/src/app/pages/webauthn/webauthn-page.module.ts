import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WebauthnPageRoutingModule } from './webauthn-page-routing.module';
import { WebauthnPageComponent } from '@ghostfolio/client/pages/webauthn/webauthn-page.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [WebauthnPageComponent],
  exports: [],
  imports: [
    WebauthnPageRoutingModule,
    CommonModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  providers: []
})
export class WebauthnPageModule {}
