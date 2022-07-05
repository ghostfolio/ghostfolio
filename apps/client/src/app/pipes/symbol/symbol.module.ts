import { NgModule } from '@angular/core';

import { SymbolPipe } from './symbol.pipe';

@NgModule({
  declarations: [SymbolPipe],
  exports: [SymbolPipe]
})
export class GfSymbolModule {}
