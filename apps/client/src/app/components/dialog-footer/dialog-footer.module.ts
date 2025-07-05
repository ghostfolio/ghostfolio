import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { IonIcon } from '@ionic/angular/standalone';

import { DialogFooterComponent } from './dialog-footer.component';

@NgModule({
  declarations: [DialogFooterComponent],
  exports: [DialogFooterComponent],
  imports: [CommonModule, IonIcon, MatButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfDialogFooterModule {}
