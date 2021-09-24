import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  ViewChild
} from '@angular/core';
import { PortfolioPerformance } from '@ghostfolio/common/interfaces';
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
          decimalPlaces: 2,
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
}
