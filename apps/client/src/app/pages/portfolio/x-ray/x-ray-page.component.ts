import { UpdateUserSettingDto } from '@ghostfolio/api/app/user/update-user-setting.dto';
import { GfRulesModule } from '@ghostfolio/client/components/rules/rules.module';
import { DataService } from '@ghostfolio/client/services/data.service';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  PortfolioReportResponse,
  PortfolioReportRule
} from '@ghostfolio/common/interfaces';
import { User } from '@ghostfolio/common/interfaces/user.interface';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  removeCircleOutline,
  warningOutline
} from 'ionicons/icons';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { Subject, takeUntil } from 'rxjs';

@Component({
  imports: [
    GfPremiumIndicatorComponent,
    GfRulesModule,
    IonIcon,
    NgClass,
    NgxSkeletonLoaderModule
  ],
  selector: 'gf-x-ray-page',
  styleUrl: './x-ray-page.component.scss',
  templateUrl: './x-ray-page.component.html'
})
export class GfXRayPageComponent {
  public accountClusterRiskRules: PortfolioReportRule[];
  public assetClassClusterRiskRules: PortfolioReportRule[];
  public currencyClusterRiskRules: PortfolioReportRule[];
  public economicMarketClusterRiskRules: PortfolioReportRule[];
  public emergencyFundRules: PortfolioReportRule[];
  public feeRules: PortfolioReportRule[];
  public hasImpersonationId: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public inactiveRules: PortfolioReportRule[];
  public isLoading = false;
  public regionalMarketClusterRiskRules: PortfolioReportRule[];
  public statistics: PortfolioReportResponse['statistics'];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private impersonationStorageService: ImpersonationStorageService,
    private userService: UserService
  ) {
    addIcons({ checkmarkCircleOutline, removeCircleOutline, warningOutline });
  }

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
    this.isLoading = true;

    this.dataService
      .fetchPortfolioReport()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ rules, statistics }) => {
        this.inactiveRules = this.mergeInactiveRules(rules);
        this.statistics = statistics;

        this.accountClusterRiskRules =
          rules['accountClusterRisk']?.filter(({ isActive }) => {
            return isActive;
          }) ?? null;

        this.assetClassClusterRiskRules =
          rules['assetClassClusterRisk']?.filter(({ isActive }) => {
            return isActive;
          }) ?? null;

        this.currencyClusterRiskRules =
          rules['currencyClusterRisk']?.filter(({ isActive }) => {
            return isActive;
          }) ?? null;

        this.economicMarketClusterRiskRules =
          rules['economicMarketClusterRisk']?.filter(({ isActive }) => {
            return isActive;
          }) ?? null;

        this.emergencyFundRules =
          rules['emergencyFund']?.filter(({ isActive }) => {
            return isActive;
          }) ?? null;

        this.feeRules =
          rules['fees']?.filter(({ isActive }) => {
            return isActive;
          }) ?? null;

        this.regionalMarketClusterRiskRules =
          rules['regionalMarketClusterRisk']?.filter(({ isActive }) => {
            return isActive;
          }) ?? null;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  private mergeInactiveRules(
    rules: PortfolioReportResponse['rules']
  ): PortfolioReportRule[] {
    let inactiveRules: PortfolioReportRule[] = [];

    for (const category in rules) {
      const rulesArray = rules[category] || [];

      inactiveRules = inactiveRules.concat(
        rulesArray.filter(({ isActive }) => {
          return !isActive;
        })
      );
    }

    return inactiveRules;
  }
}
