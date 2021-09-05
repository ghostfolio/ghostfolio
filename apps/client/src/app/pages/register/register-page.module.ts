import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { GfLogoModule } from '@ghostfolio/ui/logo';

import { RegisterPageRoutingModule } from './register-page-routing.module';
import { RegisterPageComponent } from './register-page.component';
import { ShowAccessTokenDialogModule } from './show-access-token-dialog/show-access-token-dialog.module';

@NgModule({
  declarations: [RegisterPageComponent],
  exports: [],
  imports: [
    CommonModule,
    GfLogoModule,
    MatButtonModule,
    MatCardModule,
    RegisterPageRoutingModule,
    RouterModule,
    ShowAccessTokenDialogModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegisterPageModule {}
