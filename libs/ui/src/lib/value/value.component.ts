import { getLocale } from '@ghostfolio/common/helper';

import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  input,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, copyOutline } from 'ionicons/icons';
import { isNumber } from 'lodash-es';
import ms from 'ms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { getValueChangeDirection } from './value-change.helper';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonIcon, MatButtonModule, NgxSkeletonLoaderModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-value',
  styleUrls: ['./value.component.scss'],
  templateUrl: './value.component.html'
})
export class GfValueComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() colorizeSign = false;
  @Input() deviceType: string;
  @Input() enableCopyToClipboardButton = false;

  /**
   * Number which triggers the highlight of a change instead of the value,
   * e.g. the absolute change for a change in percent which is displayed
   * with fewer digits
   */
  @Input() flashValue?: number | null;
  @Input() icon = '';
  @Input() isAbsolute = false;
  @Input() isCurrency = false;
  @Input() isDate = false;

  /**
   * Colors the whole figure (with `colorizeSign`) in green or red while the
   * market is open and in grey while it is closed
   */
  /** Colors the whole figure (sign, number and unit) in green or red */
  @Input() colorizeValue = false;
  @Input() isMarketOpen?: boolean;
  @Input() isPercent = false;
  @Input() locale?: string;
  @Input() position = '';
  @Input() size: 'large' | 'medium' | 'small' = 'small';
  @Input() subLabel?: string = '';
  @Input() unit?: string | null = '';
  @Input() value?: Date | number | string | null = '';

  @ViewChild('labelContent', { static: false })
  labelContent!: ElementRef<HTMLSpanElement>;

  public absoluteValue = 0;
  public formattedValue = '';
  public hasLabel = false;
  public isCopied = false;
  public isNumber = false;
  public isString = false;
  public useAbsoluteValue = false;

  public readonly copiedTitle = $localize`The value has been copied to the clipboard`;
  public readonly copyToClipboardTitle = $localize`Copy to clipboard`;
  public readonly isLoading = input<boolean>(false);
  public readonly precision = input<number>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private clipboard: Clipboard,
    private elementRef: ElementRef<HTMLElement>,
    private snackBar: MatSnackBar
  ) {
    addIcons({
      checkmarkOutline,
      copyOutline
    });
  }

  private copyToClipboardTimeout: ReturnType<typeof setTimeout>;

  private readonly formatOptions = computed<Intl.NumberFormatOptions>(() => {
    const digits = this.hasPrecision ? this.precision() : 2;

    return {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
      useGrouping: true
    };
  });

  protected get trendColorClass() {
    if (
      !this.colorizeSign ||
      (this.isMarketOpen === undefined && !this.colorizeValue) ||
      !isNumber(this.value)
    ) {
      return '';
    }

    if (this.isMarketOpen === false) {
      return 'text-body-secondary';
    }

    if (this.value > 0) {
      return 'text-success';
    }

    return this.value < 0 ? 'text-danger' : '';
  }

  private get hasPrecision() {
    const precision = this.precision();
    return precision !== undefined && precision >= 0;
  }

  /**
   * Briefly highlights the value in green or red if the displayed number
   * has changed, e.g. after a background refresh.
   */
  private flashOnChange(changes?: SimpleChanges) {
    const hasFlashValue = this.flashValue !== undefined;
    const change = changes?.[hasFlashValue ? 'flashValue' : 'value'];

    if (!change || change.firstChange || this.isLoading()) {
      return;
    }

    const direction = getValueChangeDirection({
      currentValue: change.currentValue,
      digits: hasFlashValue
        ? 2
        : ((this.hasPrecision ? this.precision() : 2) ?? 2) +
          (this.isPercent ? 2 : 0),
      previousValue: change.previousValue
    });

    if (!direction) {
      return;
    }

    // Highlight the whole figure (sign, number and unit) but not the full width host element
    const element =
      this.elementRef.nativeElement.querySelector<HTMLElement>(
        '.gf-value-line'
      );

    if (!element) {
      return;
    }

    element.classList.remove('gf-flash-down', 'gf-flash-up');

    // Force a reflow to restart the animation
    void element.offsetWidth;

    element.classList.add(`gf-flash-${direction}`);

    element.addEventListener(
      'animationend',
      () => {
        element.classList.remove('gf-flash-down', 'gf-flash-up');
      },
      { once: true }
    );
  }

  public ngAfterViewInit() {
    if (this.labelContent) {
      const element = this.labelContent.nativeElement;

      this.hasLabel =
        element.children.length > 0 || element.textContent.trim().length > 0;

      this.changeDetectorRef.markForCheck();
    }
  }

  public ngOnChanges(changes?: SimpleChanges) {
    this.initializeVariables();
    this.flashOnChange(changes);

    if (this.value || this.value === 0) {
      if (isNumber(this.value)) {
        this.isNumber = true;
        this.isString = false;
        this.absoluteValue = Math.abs(this.value);

        if (this.colorizeSign) {
          if (this.isCurrency) {
            try {
              this.formattedValue = this.absoluteValue.toLocaleString(
                this.locale,
                this.formatOptions()
              );
            } catch {}
          } else if (this.isPercent) {
            try {
              this.formattedValue = (this.absoluteValue * 100).toLocaleString(
                this.locale,
                this.formatOptions()
              );
            } catch {}
          }
        } else if (this.isCurrency) {
          try {
            this.formattedValue = this.value?.toLocaleString(
              this.locale,
              this.formatOptions()
            );
          } catch {}
        } else if (this.isPercent) {
          try {
            this.formattedValue = (this.value * 100).toLocaleString(
              this.locale,
              this.formatOptions()
            );
          } catch {}
        } else if (this.hasPrecision) {
          try {
            this.formattedValue = this.value?.toLocaleString(
              this.locale,
              this.formatOptions()
            );
          } catch {}
        } else {
          this.formattedValue = this.value?.toLocaleString(this.locale, {
            useGrouping: true
          });
        }

        if (this.isAbsolute) {
          // Remove algebraic sign
          this.formattedValue = this.formattedValue.replace(/^-/, '');
        }
      } else {
        this.isNumber = false;
        this.isString = true;

        if (this.isDate) {
          this.formattedValue = new Date(this.value).toLocaleDateString(
            this.locale,
            {
              day: '2-digit',
              month: '2-digit',
              year: this.deviceType === 'mobile' ? '2-digit' : 'numeric'
            }
          );
        } else {
          this.formattedValue = String(this.value);
        }
      }
    }

    if (/^-?0([.,]0*)?$/.test(this.formattedValue)) {
      // Remove algebraic sign of values rounding to zero
      this.formattedValue = this.formattedValue.replace(/^-/, '');
      this.useAbsoluteValue = true;
    }
  }

  public onCopyValueToClipboard() {
    this.clipboard.copy(String(this.value));

    this.isCopied = true;

    if (this.copyToClipboardTimeout) {
      clearTimeout(this.copyToClipboardTimeout);
    }

    this.copyToClipboardTimeout = setTimeout(() => {
      this.isCopied = false;

      this.changeDetectorRef.markForCheck();
    }, ms('3 seconds'));

    this.snackBar.open(
      '✅ ' + $localize`${this.value} has been copied to the clipboard`,
      undefined,
      {
        duration: ms('3 seconds')
      }
    );
  }

  public ngOnDestroy() {
    if (this.copyToClipboardTimeout) {
      clearTimeout(this.copyToClipboardTimeout);
    }
  }

  private initializeVariables() {
    this.absoluteValue = 0;
    this.formattedValue = '';
    this.isCopied = false;
    this.isNumber = false;
    this.isString = false;
    this.useAbsoluteValue = false;

    if (this.copyToClipboardTimeout) {
      clearTimeout(this.copyToClipboardTimeout);
    }

    if (this.locale === undefined || this.locale === '') {
      this.locale = getLocale();
    }
  }
}
