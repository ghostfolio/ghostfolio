import { prettifySymbol } from '@ghostfolio/common/helper';

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'gfSymbol'
})
export class GfSymbolPipe implements PipeTransform {
  public transform(aSymbol: string) {
    return prettifySymbol(aSymbol);
  }
}
