import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';

import { DialogHeaderComponent } from './dialog-header.component';

@NgModule({
  declarations: [DialogHeaderComponent],
  exports: [DialogHeaderComponent],
  imports: [CommonModule, MatButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfDialogHeaderModule {}
