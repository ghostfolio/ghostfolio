import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { PortfolioReportRule, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import Big from 'big.js';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  selector: 'gf-fire-page',
  styleUrls: ['./fire-page.scss'],
  templateUrl: './fire-page.html'
})
export class FirePageComponent implements OnDestroy, OnInit {
  public accountClusterRiskRules: PortfolioReportRule[];
  public currencyClusterRiskRules: PortfolioReportRule[];
  public deviceType: string;
  public feeRules: PortfolioReportRule[];
  public fireWealth: Big;
  public hasPermissionToCreateOrder: boolean;
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
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.isLoading = true;
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.dataService
      .fetchPortfolioDetails({})
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ summary }) => {
        if (summary.cash === null || summary.currentValue === null) {
          return;
        }

        this.fireWealth = new Big(summary.currentValue);
        this.withdrawalRatePerYear = this.fireWealth.mul(4).div(100);
        this.withdrawalRatePerMonth = this.withdrawalRatePerYear.div(12);

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });

    this.dataService
      .fetchPortfolioReport()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((portfolioReport) => {
        this.accountClusterRiskRules =
          portfolioReport.rules['accountClusterRisk'] || null;
        this.currencyClusterRiskRules =
          portfolioReport.rules['currencyClusterRisk'] || null;
        this.feeRules = portfolioReport.rules['fees'] || null;

        this.changeDetectorRef.markForCheck();
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToCreateOrder = hasPermission(
            this.user.permissions,
            permissions.createOrder
          );

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public onSavingsRateChange(savingsRate: number) {
    this.dataService
      .putUserSetting({ savingsRate })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService.remove();

        this.userService
          .get()
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
