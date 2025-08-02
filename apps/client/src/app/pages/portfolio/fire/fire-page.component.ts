import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfFireCalculatorComponent } from '@ghostfolio/ui/fire-calculator';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { NgStyle } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Big } from 'big.js';
import { DeviceDetectorService } from 'ngx-device-detector';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  imports: [
    GfFireCalculatorComponent,
    GfPremiumIndicatorComponent,
    GfValueComponent,
    NgStyle,
    NgxSkeletonLoaderModule
  ],
  selector: 'gf-fire-page',
  styleUrls: ['./fire-page.scss'],
  templateUrl: './fire-page.html'
})
export class GfFirePageComponent implements OnDestroy, OnInit {
  public deviceType: string;
  public fireWealth: Big;
  public hasImpersonationId: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public isLoading = false;
  public user: User;
  public withdrawalRatePerMonth: Big;
  public withdrawalRatePerYear: Big;

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
        this.fireWealth = summary.fireWealth
          ? new Big(summary.fireWealth)
          : new Big(0);

        if (this.user.subscription?.type === 'Basic') {
          this.fireWealth = new Big(10000);
        }

        this.withdrawalRatePerYear = this.fireWealth.mul(4).div(100);
        this.withdrawalRatePerMonth = this.withdrawalRatePerYear.div(12);

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });

    this.impersonationStorageService
      .onChangeHasImpersonation()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((impersonationId) => {
        this.hasImpersonationId = !!impersonationId;
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
}
