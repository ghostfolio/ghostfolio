import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GfLogoModule } from '@ghostfolio/client/components/logo/logo.module';
import { WebauthnPageComponent } from '@ghostfolio/client/pages/webauthn/webauthn-page.component';

import { WebauthnPageRoutingModule } from './webauthn-page-routing.module';

@NgModule({
  declarations: [WebauthnPageComponent],
  exports: [],
  imports: [
    CommonModule,
    GfLogoModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    WebauthnPageRoutingModule
  ],
  providers: []
})
export class WebauthnPageModule {}
