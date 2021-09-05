import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { LogoComponent } from './logo.component';

@NgModule({
  declarations: [LogoComponent],
  exports: [LogoComponent],
  imports: [CommonModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfLogoModule {}
