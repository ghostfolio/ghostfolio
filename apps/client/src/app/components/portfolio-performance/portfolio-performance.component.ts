import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import {
  getLocale,
  getNumberFormatDecimal,
  getNumberFormatGroup
} from '@ghostfolio/common/helper';
import {
  PortfolioPerformance,
  ResponseError
} from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild
} from '@angular/core';
import { CountUp } from 'countup.js';
import { isNumber } from 'lodash';

@Component({
  selector: 'gf-portfolio-performance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-performance.component.html',
  styleUrls: ['./portfolio-performance.component.scss'],
  standalone: false
})
export class PortfolioPerformanceComponent implements OnChanges {
  @Input() deviceType: string;
  @Input() errors: ResponseError['errors'];
  @Input() isAllTimeHigh: boolean;
  @Input() isAllTimeLow: boolean;
  @Input() isLoading: boolean;
  @Input() locale = getLocale();
  @Input() performance: PortfolioPerformance;
  @Input() precision: number;
  @Input() showDetails: boolean;
  @Input() unit: string;

  @ViewChild('value') value: ElementRef;

  public constructor(private notificationService: NotificationService) {}

  public ngOnChanges() {
    this.precision = this.precision >= 0 ? this.precision : 2;

    if (this.isLoading) {
      if (this.value?.nativeElement) {
        this.value.nativeElement.innerHTML = '';
      }
    } else {
      if (isNumber(this.performance?.currentValueInBaseCurrency)) {
        new CountUp('value', this.performance?.currentValueInBaseCurrency, {
          decimal: getNumberFormatDecimal(this.locale),
          decimalPlaces: this.precision,
          duration: 1,
          separator: getNumberFormatGroup(this.locale)
        }).start();
      } else if (this.showDetails === false) {
        new CountUp(
          'value',
          this.performance?.netPerformancePercentageWithCurrencyEffect * 100,
          {
            decimal: getNumberFormatDecimal(this.locale),
            decimalPlaces: 2,
            duration: 1,
            separator: getNumberFormatGroup(this.locale)
          }
        ).start();
      } else {
        this.value.nativeElement.innerHTML = '*****';
      }
    }
  }

  public onShowErrors() {
    const errorMessageParts = [];

    for (const error of this.errors) {
      errorMessageParts.push(`${error.symbol} (${error.dataSource})`);
    }

    this.notificationService.alert({
      message: errorMessageParts.join('<br />'),
      title: $localize`Market data is delayed for`
    });
  }
}
