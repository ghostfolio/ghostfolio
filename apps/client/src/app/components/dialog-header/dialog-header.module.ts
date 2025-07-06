import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { IonIcon } from '@ionic/angular/standalone';

import { DialogHeaderComponent } from './dialog-header.component';

@NgModule({
  declarations: [DialogHeaderComponent],
  exports: [DialogHeaderComponent],
  imports: [CommonModule, IonIcon, MatButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfDialogHeaderModule {}
