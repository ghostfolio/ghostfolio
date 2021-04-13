import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { SymbolIconComponent } from './symbol-icon.component';

@NgModule({
  declarations: [SymbolIconComponent],
  exports: [SymbolIconComponent],
  imports: [CommonModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfSymbolIconModule {}
