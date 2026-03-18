import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats numbers in accounting style:
 * - Positive: comma-separated (e.g., 1,000,000)
 * - Negative: parenthetical (e.g., (355,885))
 * - Zero/null/undefined: dash (-)
 *
 * Usage: {{ value | gfAccountingNumber }}
 * Usage with decimals: {{ value | gfAccountingNumber:2 }}
 */
@Pipe({
  name: 'gfAccountingNumber',
  standalone: true
})
export class GfAccountingNumberPipe implements PipeTransform {
  public transform(
    value: number | null | undefined,
    decimalPlaces: number = 0
  ): string {
    if (value === null || value === undefined || value === 0) {
      return '-';
    }

    const isNegative = value < 0;
    const absValue = Math.abs(value);

    const formatted = absValue.toLocaleString('en-US', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });

    return isNegative ? `(${formatted})` : formatted;
  }
}
