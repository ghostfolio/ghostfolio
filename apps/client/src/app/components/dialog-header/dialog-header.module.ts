import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { DialogHeaderComponent } from './dialog-header.component';

@NgModule({
  declarations: [DialogHeaderComponent],
  exports: [DialogHeaderComponent],
  imports: [CommonModule, MatButtonModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfDialogHeaderModule {}
