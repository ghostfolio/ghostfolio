import { getLocale } from '@ghostfolio/common/helper';

import { Service } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

@Service()
export class CustomPaginatorIntl extends MatPaginatorIntl {
  private locale = getLocale();

  /**
   * Formats the range label with the number format of the locale
   */
  public override getRangeLabel = (
    page: number,
    pageSize: number,
    length: number
  ) => {
    let range = this.formatNumber(0);

    if (length > 0 && pageSize > 0) {
      const startIndex = page * pageSize;

      const endIndex =
        startIndex < length
          ? Math.min(startIndex + pageSize, length)
          : startIndex + pageSize;

      range = `${this.formatNumber(startIndex + 1)} – ${this.formatNumber(endIndex)}`;
    }

    const total = this.formatNumber(Math.max(length, 0));

    return `${range} ${$localize`of`} ${total}`;
  };

  public setLocale(aLocale: string) {
    this.locale = aLocale;
    this.changes.next();
  }

  private formatNumber(aNumber: number) {
    return aNumber.toLocaleString(this.locale, { useGrouping: true });
  }
}
