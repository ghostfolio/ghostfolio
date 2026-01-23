import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
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
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormControl } from '@angular/forms';
import { Big } from 'big.js';
import { DeviceDetectorService } from 'ngx-device-detector';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
export class GfFirePageComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public fireWealth: FireWealth;
  public hasImpersonationId: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public isLoading = false;
  public projectedTotalAmount: number;
  public retirementDate: Date;
  public safeWithdrawalRateControl = new FormControl<number>(undefined);
  public safeWithdrawalRateOptions = [0.025, 0.03, 0.035, 0.04, 0.045];
  public user: User;
  public withdrawalRatePerMonth: Big;
  public withdrawalRatePerMonthProjected: Big;
  public withdrawalRatePerYear: Big;
  public withdrawalRatePerYearProjected: Big;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.isLoading = true;
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.dataService
      .fetchPortfolioDetails()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ summary }) => {
        this.fireWealth = {
          today: {
            valueInBaseCurrency: summary.fireWealth
              ? summary.fireWealth.today.valueInBaseCurrency
              : 0
          }
        };
        if (this.user.subscription?.type === 'Basic') {
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
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
      });

    this.safeWithdrawalRateControl.valueChanges
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((value) => {
        this.onSafeWithdrawalRateChange(Number(value));
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToUpdateUserSettings =
            this.user.subscription?.type === 'Basic'
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

  public onAnnualInterestRateChange(annualInterestRate: number) {
    this.dataService
      .putUserSetting({ annualInterestRate })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public onCalculationComplete({
    projectedTotalAmount,
    retirementDate
  }: FireCalculationCompleteEvent) {
    this.projectedTotalAmount = projectedTotalAmount;
    this.retirementDate = retirementDate;

    this.calculateWithdrawalRatesProjected();

    this.isLoading = false;
  }

  public onRetirementDateChange(retirementDate: Date) {
    this.dataService
      .putUserSetting({
        retirementDate: retirementDate.toISOString(),
        projectedTotalAmount: null
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public onSafeWithdrawalRateChange(safeWithdrawalRate: number) {
    this.dataService
      .putUserSetting({ safeWithdrawalRate })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.calculateWithdrawalRates();
            this.calculateWithdrawalRatesProjected();

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public onSavingsRateChange(savingsRate: number) {
    this.dataService
      .putUserSetting({ savingsRate })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public onProjectedTotalAmountChange(projectedTotalAmount: number) {
    this.dataService
      .putUserSetting({
        projectedTotalAmount,
        retirementDate: null
      })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();
          });
      });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
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
}
