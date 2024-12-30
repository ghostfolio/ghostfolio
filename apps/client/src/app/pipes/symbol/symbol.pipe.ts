import { prettifySymbol } from '@ghostfolio/common/helper';

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'gfSymbol',
  standalone: false
})
export class SymbolPipe implements PipeTransform {
  public transform(aSymbol: string) {
    return prettifySymbol(aSymbol);
  }
}
