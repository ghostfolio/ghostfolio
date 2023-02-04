import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { WebauthnPageComponent } from '@ghostfolio/client/pages/webauthn/webauthn-page.component';
import { GfLogoModule } from '@ghostfolio/ui/logo';

import { WebauthnPageRoutingModule } from './webauthn-page-routing.module';

@NgModule({
  declarations: [WebauthnPageComponent],
  imports: [
    CommonModule,
    GfLogoModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    WebauthnPageRoutingModule
  ]
})
export class WebauthnPageModule {}
