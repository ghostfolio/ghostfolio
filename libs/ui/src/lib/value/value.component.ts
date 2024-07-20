import { getLocale } from '@ghostfolio/common/helper';

import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { isNumber } from 'lodash';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgxSkeletonLoaderModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-value',
  standalone: true,
  styleUrls: ['./value.component.scss'],
  templateUrl: './value.component.html'
})
export class GfValueComponent implements OnChanges {
  @Input() colorizeSign = false;
  @Input() icon = '';
  @Input() isAbsolute = false;
  @Input() isCurrency = false;
  @Input() isDate = false;
  @Input() isPercent = false;
  @Input() locale: string;
  @Input() position = '';
  @Input() precision: number;
  @Input() size: 'large' | 'medium' | 'small' = 'small';
  @Input() subLabel = '';
  @Input() unit = '';
  @Input() value: number | string = '';

  public absoluteValue = 0;
  public formattedValue = '';
  public isNumber = false;
  public isString = false;
  public useAbsoluteValue = false;

  public constructor() {}

  public ngOnChanges() {
    this.initializeVariables();

    if (this.value || this.value === 0) {
      if (isNumber(this.value)) {
        this.isNumber = true;
        this.isString = false;
        this.absoluteValue = Math.abs(<number>this.value);

        if (this.colorizeSign) {
          if (this.isCurrency) {
            try {
              this.formattedValue = this.absoluteValue.toLocaleString(
                this.locale,
                {
                  maximumFractionDigits: this.precision,
                  minimumFractionDigits: this.precision
                }
              );
            } catch {}
          } else if (this.isPercent) {
            try {
              this.formattedValue = (this.absoluteValue * 100).toLocaleString(
                this.locale,
                {
                  maximumFractionDigits: this.precision,
                  minimumFractionDigits: this.precision
                }
              );
            } catch {}
          }
        } else if (this.isCurrency) {
          try {
            this.formattedValue = this.value?.toLocaleString(this.locale, {
              maximumFractionDigits: this.precision,
              minimumFractionDigits: this.precision
            });
          } catch {}
        } else if (this.isPercent) {
          try {
            this.formattedValue = (this.value * 100).toLocaleString(
              this.locale,
              {
                maximumFractionDigits: this.precision,
                minimumFractionDigits: this.precision
              }
            );
          } catch {}
        } else {
          this.formattedValue = this.value?.toLocaleString(this.locale);
        }

        if (this.isAbsolute) {
          // Remove algebraic sign
          this.formattedValue = this.formattedValue.replace(/^-/, '');
        }
      } else {
        this.isNumber = false;
        this.isString = true;

        if (this.isDate) {
          this.formattedValue = new Date(<string>this.value).toLocaleDateString(
            this.locale,
            {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            }
          );
        } else {
          this.formattedValue = this.value;
        }
      }
    }

    if (this.formattedValue === '0.00') {
      this.useAbsoluteValue = true;
    }
  }

  private initializeVariables() {
    this.absoluteValue = 0;
    this.formattedValue = '';
    this.isNumber = false;
    this.isString = false;
    this.locale = this.locale || getLocale();
    this.precision = this.precision >= 0 ? this.precision : 2;
    this.useAbsoluteValue = false;
  }
}
