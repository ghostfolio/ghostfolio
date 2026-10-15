import { NUMERICAL_PRECISION_THRESHOLD_6_FIGURES } from '@ghostfolio/common/config';
import { getDateFnsLocale, getLocale } from '@ghostfolio/common/helper';
import { PortfolioSummary, User } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';
import { translate } from '@ghostfolio/ui/i18n';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfValueComponent } from '@ghostfolio/ui/value';

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  output,
  signal
} from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IonIcon } from '@ionic/angular/standalone';
import { formatDistanceToNow } from 'date-fns';
import { addIcons } from 'ionicons';
import {
  caretForwardOutline,
  ellipsisHorizontalCircleOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { isNumber } from 'lodash-es';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    GfValueComponent,
    IonIcon,
    MatTooltipModule,
    NgxSkeletonLoaderModule
  ],
  selector: 'gf-portfolio-summary',
  styleUrls: ['./portfolio-summary.component.scss'],
  templateUrl: './portfolio-summary.component.html'
})
export class GfPortfolioSummaryComponent implements OnChanges, OnDestroy {
  @Input() public baseCurrency?: string;
  @Input() public deviceType: string;
  @Input() public hasImpersonationId: boolean;
  @Input() public hasPermissionToUpdateUserSettings: boolean;
  @Input() public isLoading: boolean;
  @Input() public investmentPlan: {
    cashBuffer: number;
    cashReserve: number;
    longTermGrowthTarget: number;
    preservationBucket: number;
    sipMonthlyBudget: number;
  } | null = null;
  @Input() public language?: string;
  @Input() public locale?: string = getLocale();
  @Input() public summary?: PortfolioSummary;
  @Input() public user?: User;

  public emergencyFundChanged = output<number>();

  protected readonly buyAndSellActivitiesTooltip = translate(
    'BUY_AND_SELL_ACTIVITIES_TOOLTIP'
  );

  protected readonly isNumber = isNumber;
  protected readonly PerformanceCalculationType = PerformanceCalculationType;

  protected isCashExpanded = false;
  protected isHoldingsExpanded = false;
  protected precision = 2;
  protected showSimpleReturn = signal(false);
  protected timeInMarket: string | undefined;

  private readonly notificationService = inject(NotificationService);
  private simpleReturnToggleIntervalId: ReturnType<typeof setInterval>;

  public constructor() {
    addIcons({
      caretForwardOutline,
      ellipsisHorizontalCircleOutline,
      informationCircleOutline
    });

    this.simpleReturnToggleIntervalId = setInterval(() => {
      this.showSimpleReturn.update((value) => !value);
    }, 60000);
  }

  public ngOnDestroy() {
    clearInterval(this.simpleReturnToggleIntervalId);
  }

  protected get cashPercentage() {
    return this.summary?.totalValueInBaseCurrency
      ? this.summary.totalCashInBaseCurrency /
          this.summary.totalValueInBaseCurrency
      : 0;
  }

  protected get displayedCurrency() {
    return this.deviceType === 'mobile' ? undefined : this.baseCurrency;
  }

  protected get emergencyFundPercentage() {
    return this.summary?.totalValueInBaseCurrency
      ? (this.summary.emergencyFund?.total || 0) /
          this.summary.totalValueInBaseCurrency
      : 0;
  }

  protected get excludedFromAnalysisPercentage() {
    return this.summary?.totalValueInBaseCurrency
      ? this.summary.excludedAccountsAndActivities /
          this.summary.totalValueInBaseCurrency
      : 0;
  }

  protected get hasCashBreakdown() {
    return !this.isLoading && (this.summary?.emergencyFund?.cash ?? 0) > 0;
  }

  protected get hasHoldingsBreakdown() {
    return !this.isLoading && (this.summary?.emergencyFund?.assets ?? 0) > 0;
  }

  protected get holdingsInBaseCurrency() {
    if (
      !isNumber(this.summary?.totalAssetsInBaseCurrency) ||
      !isNumber(this.summary?.totalCashInBaseCurrency)
    ) {
      return null;
    }

    return (
      this.summary.totalAssetsInBaseCurrency -
      this.summary.totalCashInBaseCurrency
    );
  }

  protected get holdingsPercentage() {
    return this.summary?.totalValueInBaseCurrency &&
      isNumber(this.holdingsInBaseCurrency)
      ? this.holdingsInBaseCurrency / this.summary.totalValueInBaseCurrency
      : 0;
  }

  protected get investmentsInBaseCurrency() {
    if (!isNumber(this.holdingsInBaseCurrency)) {
      return null;
    }

    return (
      this.holdingsInBaseCurrency - (this.summary?.emergencyFund?.assets ?? 0)
    );
  }

  protected get simpleReturnPercentage() {
    return this.summary?.totalInvestmentValueWithCurrencyEffect
      ? this.summary.netPerformanceWithCurrencyEffect /
          this.summary.totalInvestmentValueWithCurrencyEffect
      : undefined;
  }

  public ngOnChanges() {
    if (this.summary) {
      if (
        this.deviceType === 'mobile' &&
        (this.summary.totalValueInBaseCurrency ?? 0) >=
          NUMERICAL_PRECISION_THRESHOLD_6_FIGURES
      ) {
        this.precision = 0;
      }

      if (this.summary.dateOfFirstActivity) {
        this.timeInMarket = formatDistanceToNow(
          this.summary.dateOfFirstActivity,
          {
            locale: getDateFnsLocale(this.language)
          }
        );
      } else {
        this.timeInMarket = '–';
      }
    } else {
      this.timeInMarket = undefined;
    }
  }

  protected onEditEmergencyFund() {
    this.notificationService.prompt({
      confirmFn: (value) => {
        const emergencyFund = parseFloat(value.trim()) || 0;

        this.emergencyFundChanged.emit(emergencyFund);
      },
      confirmLabel: $localize`Save`,
      defaultValue: this.summary?.emergencyFund?.total?.toString() ?? '0',
      title: $localize`Please set the amount of your emergency fund.`,
      valueSuffix: this.baseCurrency
    });
  }

  protected onToggleCash() {
    this.isCashExpanded = !this.isCashExpanded;
  }

  protected onToggleHoldings() {
    this.isHoldingsExpanded = !this.isHoldingsExpanded;
  }
}
