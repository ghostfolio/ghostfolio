import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { DialogFooterComponent } from './dialog-footer.component';

@NgModule({
  declarations: [DialogFooterComponent],
  exports: [DialogFooterComponent],
  imports: [CommonModule, MatButtonModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfDialogFooterModule {}
