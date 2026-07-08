import {
  getLocale,
  getNumberFormatDecimal,
  getNumberFormatGroup
} from '@ghostfolio/common/helper';
import {
  PortfolioPerformance,
  ResponseError
} from '@ghostfolio/common/interfaces';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  viewChild
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { CountUp } from 'countup.js';
import { addIcons } from 'ionicons';
import { timeOutline } from 'ionicons/icons';
import { isNumber } from 'lodash';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GfValueComponent, IonIcon, NgxSkeletonLoaderModule],
  selector: 'gf-portfolio-performance',
  styleUrls: ['./portfolio-performance.component.scss'],
  templateUrl: './portfolio-performance.component.html'
})
export class GfPortfolioPerformanceComponent {
  public readonly errors = input<ResponseError['errors']>();
  public readonly isLoading = input<boolean>();
  public readonly locale = input<string>(getLocale());
  public readonly performance = input.required<PortfolioPerformance>();
  public readonly precision = input.required<number, number>({
    transform: (value) => {
      return value >= 0 ? value : 2;
    }
  });
  public readonly showDetails = input<boolean>(false);
  public readonly unit = input.required<string>();

  private readonly value =
    viewChild.required<ElementRef<HTMLSpanElement>>('value');

  private readonly notificationService = inject(NotificationService);

  public constructor() {
    addIcons({ timeOutline });

    effect(() => {
      if (this.isLoading()) {
        if (this.value().nativeElement) {
          this.value().nativeElement.innerHTML = '';
        }
      } else {
        if (isNumber(this.performance().currentValueInBaseCurrency)) {
          new CountUp('value', this.performance().currentValueInBaseCurrency, {
            decimal: getNumberFormatDecimal(this.locale()),
            decimalPlaces: this.precision(),
            duration: 1,
            separator: getNumberFormatGroup(this.locale())
          }).start();
        } else if (this.showDetails() === false) {
          new CountUp(
            'value',
            this.performance().netPerformancePercentageWithCurrencyEffect * 100,
            {
              decimal: getNumberFormatDecimal(this.locale()),
              decimalPlaces: 2,
              duration: 1,
              separator: getNumberFormatGroup(this.locale())
            }
          ).start();
        } else {
          this.value().nativeElement.innerHTML = '*****';
        }
      }
    });
  }

  protected onShowErrors() {
    const errors = this.errors();

    if (!errors?.length) {
      return;
    }

    const errorMessageParts: string[] = [];

    for (const error of errors) {
      errorMessageParts.push(`${error.symbol} (${error.dataSource})`);
    }

    this.notificationService.alert({
      message: errorMessageParts.join('<br />'),
      title: $localize`Market data is delayed for`
    });
  }
}
