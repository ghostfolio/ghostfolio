import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { SubscriptionType } from '@ghostfolio/common/enums';
import {
  FireCalculationCompleteEvent,
  FireWealth,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfFireCalculatorComponent } from '@ghostfolio/ui/fire-calculator';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule, NgStyle } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormControl } from '@angular/forms';
import { Big } from 'big.js';
import { DeviceDetectorService } from 'ngx-device-detector';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  imports: [
    CommonModule,
    FormsModule,
    GfFireCalculatorComponent,
    GfPremiumIndicatorComponent,
    GfValueComponent,
    NgStyle,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule
  ],
  selector: 'gf-fire-page',
  styleUrls: ['./fire-page.scss'],
  templateUrl: './fire-page.html'
})
export class GfFirePageComponent implements OnInit {
  protected readonly deviceType = computed(
    () => this.deviceDetectorService.deviceInfo().deviceType
  );

  protected fireWealth: FireWealth;
  protected hasImpersonationId: boolean;
  protected hasPermissionToUpdateUserSettings: boolean;
  protected isLoading = false;
  protected retirementDate: Date;
  protected readonly safeWithdrawalRateControl = new FormControl<
    number | undefined
  >(undefined);
  protected readonly safeWithdrawalRateOptions = [
    0.025, 0.03, 0.035, 0.04, 0.045
  ] as const;
  protected user: User;
  protected withdrawalRatePerMonth: Big;
  protected withdrawalRatePerMonthProjected: Big;
  protected withdrawalRatePerYear: Big;
  protected withdrawalRatePerYearProjected: Big;

  private projectedTotalAmount: number;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly deviceDetectorService = inject(DeviceDetectorService);
  private readonly impersonationStorageService = inject(
    ImpersonationStorageService
  );
  private readonly userService = inject(UserService);

  public ngOnInit() {
    this.isLoading = true;

    this.dataService
      .fetchPortfolioDetails()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ summary }) => {
        this.fireWealth = {
          today: {
            valueInBaseCurrency: summary?.fireWealth
              ? summary.fireWealth.today.valueInBaseCurrency
              : 0
          }
        };
        if (this.user.subscription?.type === SubscriptionType.Basic) {
          this.fireWealth = {
            today: {
              valueInBaseCurrency: 10000
            }
          };
        }

        this.calculateWithdrawalRates();

        this.changeDetectorRef.markForCheck();
      });

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.safeWithdrawalRateControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.updateSafeWithdrawalRate(Number(value));
      });

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToUpdateUserSettings =
            this.user.subscription?.type === SubscriptionType.Basic
              ? false
              : hasPermission(
                  this.user.permissions,
                  permissions.updateUserSettings
                );

          this.safeWithdrawalRateControl.setValue(
            this.user.settings.safeWithdrawalRate,
            { emitEvent: false }
          );

          this.calculateWithdrawalRates();

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  protected onAnnualInterestRateChange(annualInterestRate: number) {
    this.dataService
      .putUserSetting({ annualInterestRate })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  protected onCalculationComplete({
    projectedTotalAmount,
    retirementDate
  }: FireCalculationCompleteEvent) {
    this.projectedTotalAmount = projectedTotalAmount;
    this.retirementDate = retirementDate;

    this.calculateWithdrawalRatesProjected();

    this.isLoading = false;
  }

  protected onProjectedTotalAmountChange(projectedTotalAmount: number) {
    this.dataService
      .putUserSetting({
        projectedTotalAmount,
        retirementDate: null
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  protected onRetirementDateChange(retirementDate: Date) {
    this.dataService
      .putUserSetting({
        projectedTotalAmount: null,
        retirementDate: retirementDate.toISOString()
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  protected onSavingsRateChange(savingsRate: number) {
    this.dataService
      .putUserSetting({ savingsRate })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  private calculateWithdrawalRates() {
    if (this.fireWealth && this.user?.settings?.safeWithdrawalRate) {
      this.withdrawalRatePerYear = new Big(
        this.fireWealth.today.valueInBaseCurrency
      ).mul(this.user.settings.safeWithdrawalRate);

      this.withdrawalRatePerMonth = this.withdrawalRatePerYear.div(12);
    }
  }

  private calculateWithdrawalRatesProjected() {
    if (
      this.fireWealth &&
      this.projectedTotalAmount &&
      this.user?.settings?.safeWithdrawalRate
    ) {
      this.withdrawalRatePerYearProjected = new Big(
        this.projectedTotalAmount
      ).mul(this.user.settings.safeWithdrawalRate);

      this.withdrawalRatePerMonthProjected =
        this.withdrawalRatePerYearProjected.div(12);
    }
  }

  private updateSafeWithdrawalRate(safeWithdrawalRate: number) {
    this.dataService
      .putUserSetting({ safeWithdrawalRate })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((user) => {
            this.user = user;

            this.calculateWithdrawalRates();
            this.calculateWithdrawalRatesProjected();

            this.changeDetectorRef.markForCheck();
          });
      });
  }
}
