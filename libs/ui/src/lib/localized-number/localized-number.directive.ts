import { DEFAULT_LOCALE } from '@ghostfolio/common/config';
import {
  extractNumberFromString,
  formatNumberForLocale
} from '@ghostfolio/common/helper';

import { DOCUMENT } from '@angular/common';
import {
  Directive,
  ElementRef,
  forwardRef,
  inject,
  input
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  host: {
    '(blur)': 'handleBlur()',
    '(input)': 'handleInput()',
    '[attr.inputmode]': '"decimal"',
    '[attr.type]': '"text"'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GfLocalizedNumberDirective),
      multi: true
    }
  ],
  selector: 'input[gfLocalizedNumber]'
})
export class GfLocalizedNumberDirective implements ControlValueAccessor {
  public readonly locale = input<string>();

  private readonly document = inject(DOCUMENT);
  private readonly elementRef =
    inject<ElementRef<HTMLInputElement>>(ElementRef);

  public handleBlur() {
    this.onTouched();
  }

  public handleInput() {
    const value = this.elementRef.nativeElement.value;

    if (!value?.trim()) {
      this.onChange(null);
      return;
    }

    // Locale resolution priority:
    //   1. explicit [locale] input from the template
    //   2. document.documentElement.lang — set by Angular i18n to the active
    //      language (e.g. 'de' when the app runs under /de/)
    //   3. DEFAULT_LOCALE ('en-US') as the final fallback
    const localeInput = this.locale();
    const documentLang = this.document.documentElement.lang;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const resolvedLocale = localeInput || documentLang || DEFAULT_LOCALE;

    const parsedNumber = extractNumberFromString({
      locale: resolvedLocale,
      value
    });

    this.onChange(
      parsedNumber !== undefined && !Number.isNaN(parsedNumber)
        ? parsedNumber
        : null
    );
  }

  public registerOnChange(fn: (value: number | null) => void) {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean) {
    this.elementRef.nativeElement.disabled = isDisabled;
  }

  public writeValue(value: number | null) {
    if (
      value === null ||
      value === undefined ||
      typeof value !== 'number' ||
      Number.isNaN(value)
    ) {
      this.elementRef.nativeElement.value = '';
      return;
    }

    const localeInput = this.locale();
    const documentLang = this.document.documentElement.lang;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const resolvedLocale = localeInput || documentLang || DEFAULT_LOCALE;

    this.elementRef.nativeElement.value = formatNumberForLocale({
      locale: resolvedLocale,
      value
    });
  }

  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
}
