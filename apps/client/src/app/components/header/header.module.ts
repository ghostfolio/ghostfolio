import { LoginWithAccessTokenDialogModule } from '@ghostfolio/client/components/login-with-access-token-dialog/login-with-access-token-dialog.module';
import { GfAssistantModule } from '@ghostfolio/ui/assistant';
import { GfLogoModule } from '@ghostfolio/ui/logo';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';

import { HeaderComponent } from './header.component';

@NgModule({
  declarations: [HeaderComponent],
  exports: [HeaderComponent],
  imports: [
    CommonModule,
    GfAssistantModule,
    GfLogoModule,
    GfPremiumIndicatorModule,
    LoginWithAccessTokenDialogModule,
    MatButtonModule,
    MatMenuModule,
    MatToolbarModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHeaderModule {}
