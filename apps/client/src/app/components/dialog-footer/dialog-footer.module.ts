import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';

import { DialogFooterComponent } from './dialog-footer.component';

@NgModule({
  declarations: [DialogFooterComponent],
  exports: [DialogFooterComponent],
  imports: [CommonModule, MatButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfDialogFooterModule {}
