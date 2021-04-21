import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { GfLineChartModule } from '@ghostfolio/client/components/line-chart/line-chart.module';
import { GfLogoModule } from '@ghostfolio/client/components/logo/logo.module';

import { LoginPageRoutingModule } from './login-page-routing.module';
import { LoginPageComponent } from './login-page.component';
import { ShowAccessTokenDialogModule } from './show-access-token-dialog/show-access-token-dialog.module';

@NgModule({
  declarations: [LoginPageComponent],
  exports: [],
  imports: [
    CommonModule,
    GfLineChartModule,
    GfLogoModule,
    LoginPageRoutingModule,
    MatButtonModule,
    RouterModule,
    ShowAccessTokenDialogModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginPageModule {}
