import { GfLogoModule } from '@ghostfolio/ui/logo';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { RegisterPageRoutingModule } from './register-page-routing.module';
import { RegisterPageComponent } from './register-page.component';
import { ShowAccessTokenDialogModule } from './show-access-token-dialog/show-access-token-dialog.module';

@NgModule({
  declarations: [RegisterPageComponent],
  imports: [
    CommonModule,
    GfLogoModule,
    MatButtonModule,
    RegisterPageRoutingModule,
    RouterModule,
    ShowAccessTokenDialogModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegisterPageModule {}
