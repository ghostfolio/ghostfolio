import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  PortfolioReportRule,
  PortfolioReport
} from '@ghostfolio/common/interfaces';
import { User } from '@ghostfolio/common/interfaces/user.interface';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { ChangeDetectorRef, Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'gf-xray-page',
  templateUrl: './x-ray.component.html',
  styleUrl: './x-ray.component.scss'
})
export class XRayComponent {
  public accountClusterRiskRules: PortfolioReportRule[];
  public currencyClusterRiskRules: PortfolioReportRule[];
  public economicMarketClusterRiskRules: PortfolioReportRule[];
  public emergencyFundRules: PortfolioReportRule[];
  public feeRules: PortfolioReportRule[];
  public hasImpersonationId: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public inactiveRules: PortfolioReportRule[];
  public isLoadingPortfolioReport = false;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {}

  public ngOnInit() {
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

  public onRulesUpdated(event: UpdateUserSettingDto) {
    this.dataService
      .putUserSetting(event)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService
          .get(true)
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe();

        this.initializePortfolioReport();
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

        this.economicMarketClusterRiskRules =
          portfolioReport.rules['economicMarketClusterRisk']?.filter(
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
