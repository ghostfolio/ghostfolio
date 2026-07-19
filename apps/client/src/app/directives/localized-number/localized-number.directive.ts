import { DEFAULT_LOCALE } from '@ghostfolio/common/config';
import { extractNumberFromString } from '@ghostfolio/common/helper';

import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, inject, input } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

@Directive({
  host: {
    '(blur)': 'handleBlur()',
    '(input)': 'handleInput()',
    '[attr.inputmode]': '"decimal"',
    '[attr.type]': '"text"'
  },
  selector: 'input[gfLocalizedNumber]'
})
export class GfLocalizedNumberDirective implements ControlValueAccessor {
  public readonly locale = input<string>();

  private readonly document = inject(DOCUMENT);
  private readonly elementRef =
    inject<ElementRef<HTMLInputElement>>(ElementRef);

  public constructor() {
    const ngControl = inject(NgControl, { optional: true, self: true });

    if (ngControl) {
      // Replace DefaultValueAccessor so the FormControl stores a number
      ngControl.valueAccessor = this;
    }
  }

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
    const resolvedLocale = localeInput ?? documentLang ?? DEFAULT_LOCALE;

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
    this.elementRef.nativeElement.value =
      value === null || value === undefined || Number.isNaN(value)
        ? ''
        : String(value);
  }

  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
}
