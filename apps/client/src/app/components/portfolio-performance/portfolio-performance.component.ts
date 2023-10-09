import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  ViewChild
} from '@angular/core';
import {
  getNumberFormatDecimal,
  getNumberFormatGroup
} from '@ghostfolio/common/helper';
import {
  PortfolioPerformance,
  ResponseError
} from '@ghostfolio/common/interfaces';
import { CountUp } from 'countup.js';
import { isNumber } from 'lodash';

@Component({
  selector: 'gf-portfolio-performance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './portfolio-performance.component.html',
  styleUrls: ['./portfolio-performance.component.scss']
})
export class PortfolioPerformanceComponent implements OnChanges, OnInit {
  @Input() baseCurrency: string;
  @Input() deviceType: string;
  @Input() errors: ResponseError['errors'];
  @Input() isAllTimeHigh: boolean;
  @Input() isAllTimeLow: boolean;
  @Input() isLoading: boolean;
  @Input() locale: string;
  @Input() performance: PortfolioPerformance;
  @Input() showDetails: boolean;

  @ViewChild('value') value: ElementRef;

  public unit: string;

  public constructor() {}

  public ngOnInit() {}

  public ngOnChanges() {
    if (this.isLoading) {
      if (this.value?.nativeElement) {
        this.value.nativeElement.innerHTML = '';
      }
    } else {
      if (isNumber(this.performance?.currentValue)) {
        this.unit = this.baseCurrency;

        new CountUp('value', this.performance?.currentValue, {
          decimal: getNumberFormatDecimal(this.locale),
          decimalPlaces:
            this.deviceType === 'mobile' &&
            this.performance?.currentValue >= 100000
              ? 0
              : 2,
          duration: 1,
          separator: getNumberFormatGroup(this.locale)
        }).start();
      } else if (this.performance?.currentValue === null) {
        this.unit = '%';

        new CountUp(
          'value',
          this.performance?.currentNetPerformancePercent * 100,
          {
            decimal: getNumberFormatDecimal(this.locale),
            decimalPlaces: 2,
            duration: 1,
            separator: getNumberFormatGroup(this.locale)
          }
        ).start();
      }
    }
  }

  public onShowErrors() {
    const errorMessageParts = ['Data Provider Errors for'];

    for (const error of this.errors) {
      errorMessageParts.push(`${error.symbol} (${error.dataSource})`);
    }

    alert(errorMessageParts.join('\n'));
  }
}
