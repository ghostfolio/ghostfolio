import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges
} from '@angular/core';
import { getLocale } from '@ghostfolio/common/helper';
import { isNumber } from 'lodash';

@Component({
  selector: 'gf-value',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './value.component.html',
  styleUrls: ['./value.component.scss']
})
export class ValueComponent implements OnChanges {
  @Input() colorizeSign = false;
  @Input() currency = '';
  @Input() isAbsolute = false;
  @Input() isCurrency = false;
  @Input() isDate = false;
  @Input() isPercent = false;
  @Input() label = '';
  @Input() locale = getLocale();
  @Input() position = '';
  @Input() precision: number | undefined;
  @Input() size: 'large' | 'medium' | 'small' = 'small';
  @Input() value: number | string = '';

  public absoluteValue = 0;
  public formattedValue = '';
  public isNumber = false;
  public isString = false;
  public useAbsoluteValue = false;

  public constructor() {}

  public ngOnChanges() {
    if (this.value || this.value === 0) {
      if (isNumber(this.value)) {
        this.isNumber = true;
        this.isString = false;
        this.absoluteValue = Math.abs(<number>this.value);

        if (this.colorizeSign) {
          if (this.currency || this.isCurrency) {
            try {
              this.formattedValue = this.absoluteValue.toLocaleString(
                this.locale,
                {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2
                }
              );
            } catch {}
          } else if (this.isPercent) {
            try {
              this.formattedValue = (this.absoluteValue * 100).toLocaleString(
                this.locale,
                {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2
                }
              );
            } catch {}
          }
        } else if (this.isPercent) {
          try {
            this.formattedValue = (this.value * 100).toLocaleString(
              this.locale,
              {
                maximumFractionDigits: 2,
                minimumFractionDigits: 2
              }
            );
          } catch {}
        } else if (this.currency || this.isCurrency) {
          try {
            this.formattedValue = this.value?.toLocaleString(this.locale, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2
            });
          } catch {}
        } else if (this.precision || this.precision === 0) {
          try {
            this.formattedValue = this.value?.toLocaleString(this.locale, {
              maximumFractionDigits: this.precision,
              minimumFractionDigits: this.precision
            });
          } catch {}
        } else {
          this.formattedValue = this.value?.toString();
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
}
