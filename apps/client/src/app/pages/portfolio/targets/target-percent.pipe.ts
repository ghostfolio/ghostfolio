import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';

export function getTargetNumberLocale(
  locale: string | undefined,
  fallback: string
) {
  try {
    return Intl.getCanonicalLocales(locale ?? fallback)[0] ?? fallback;
  } catch {
    return fallback;
  }
}

/** Use the user's number locale independently from the interface language. */
@Pipe({ name: 'targetPercent' })
export class GfTargetPercentPipe implements PipeTransform {
  private readonly defaultLocale = inject(LOCALE_ID);

  public transform(
    value: number,
    locale?: string,
    maximumFractionDigits = 2,
    signed = false
  ) {
    return new Intl.NumberFormat(
      getTargetNumberLocale(locale, this.defaultLocale),
      {
        style: 'percent',
        maximumFractionDigits,
        signDisplay: signed ? 'always' : 'auto'
      }
    ).format(value);
  }
}
