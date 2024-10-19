import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  PortfolioReport,
  PortfolioReportRule,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Big } from 'big.js';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-fire-page',
  styleUrls: ['./fire-page.scss'],
  templateUrl: './fire-page.html'
})
export class FirePageComponent implements OnDestroy, OnInit {
  public accountClusterRiskRules: PortfolioReportRule[];
  public currencyClusterRiskRules: PortfolioReportRule[];
  public deviceType: string;
  public emergencyFundRules: PortfolioReportRule[];
  public feeRules: PortfolioReportRule[];
  public fireWealth: Big;
  public hasImpersonationId: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public inactiveRules: PortfolioReportRule[];
  public isLoading = false;
  public isLoadingPortfolioReport = false;
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

    this.initializePortfolioReport();
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

  public onRulesUpdated(event: UpdateUserSettingDto) {
    this.dataService
      .putUserSetting(event)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.initializePortfolioReport();
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

  private initializePortfolioReport() {
    this.isLoadingPortfolioReport = true;

    this.dataService
      .fetchPortfolioReport()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((portfolioReport) => {
        this.inactiveRules = this.mergeInactiveRules(portfolioReport);

        this.accountClusterRiskRules =
          portfolioReport.rules['accountClusterRisk']?.filter(
            ({ isActive }) => {
              return isActive;
            }
          ) ?? null;

        this.currencyClusterRiskRules =
          portfolioReport.rules['currencyClusterRisk']?.filter(
            ({ isActive }) => {
              return isActive;
            }
          ) ?? null;

        this.emergencyFundRules =
          portfolioReport.rules['emergencyFund']?.filter(({ isActive }) => {
            return isActive;
          }) ?? null;

        this.feeRules =
          portfolioReport.rules['fees']?.filter(({ isActive }) => {
            return isActive;
          }) ?? null;

        this.isLoadingPortfolioReport = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  private mergeInactiveRules(report: PortfolioReport): PortfolioReportRule[] {
    let inactiveRules: PortfolioReportRule[] = [];

    for (const category in report.rules) {
      const rulesArray = report.rules[category];

      inactiveRules = inactiveRules.concat(
        rulesArray.filter(({ isActive }) => {
          return !isActive;
        })
      );
    }

    return inactiveRules;
  }
}
