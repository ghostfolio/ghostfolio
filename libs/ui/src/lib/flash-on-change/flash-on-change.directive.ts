import {
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  untracked
} from '@angular/core';

import { getValueChangeDirection } from '../value/value-change.helper';

/**
 * Briefly highlights the host element (e.g. a table row) in green or red if
 * the bound number changes, e.g. after a background refresh. The highlight
 * is styled globally by the `gf-flash-up` and `gf-flash-down` classes.
 */
@Directive({
  selector: '[gfFlashOnChange]'
})
export class GfFlashOnChangeDirective {
  public readonly gfFlashDigits = input(2);
  public readonly gfFlashOnChange = input<number | null | undefined>();

  private hasValue = false;
  private previousValue: number | null | undefined;

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  public constructor() {
    effect(() => {
      const digits = this.gfFlashDigits();
      const value = this.gfFlashOnChange();

      untracked(() => {
        if (this.hasValue) {
          const direction = getValueChangeDirection({
            digits,
            currentValue: value,
            previousValue: this.previousValue
          });

          if (direction) {
            this.flash(direction);
          }
        }

        this.hasValue = true;
        this.previousValue = value;
      });
    });
  }

  private flash(aDirection: 'down' | 'up') {
    const element = this.element.nativeElement;

    element.classList.remove('gf-flash-down', 'gf-flash-up');

    // Force a reflow to restart the animation
    void element.offsetWidth;

    element.classList.add(`gf-flash-${aDirection}`);

    element.addEventListener(
      'animationend',
      () => {
        element.classList.remove('gf-flash-down', 'gf-flash-up');
      },
      { once: true }
    );
  }
}
