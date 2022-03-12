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
  @Input() hasError: boolean;
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
          decimalPlaces:
            this.deviceType === 'mobile' &&
            this.performance?.currentValue >= 100000
              ? 0
              : 2,
          duration: 1,
          separator: `'`
        }).start();
      } else if (this.performance?.currentValue === null) {
        this.unit = '%';

        new CountUp(
          'value',
          this.performance?.currentNetPerformancePercent * 100,
          {
            decimalPlaces: 2,
            duration: 0.75,
            separator: `'`
          }
        ).start();
      }
    }
  }

  public onShowErrors() {
    const errorMessageParts = this.errors.map((error) => {
      return `${error.symbol} (${error.dataSource})`;
    });

    alert(errorMessageParts.join('\n'));
  }
}
