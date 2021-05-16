import { Pipe, PipeTransform } from '@angular/core';
import { ghostfolioScraperApiSymbolPrefix } from '@ghostfolio/common/config';

@Pipe({ name: 'gfSymbol' })
export class SymbolPipe implements PipeTransform {
  public constructor() {}

  public transform(aSymbol: string): string {
    return aSymbol?.replace(ghostfolioScraperApiSymbolPrefix, '');
  }
}
