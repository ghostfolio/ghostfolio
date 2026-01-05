import { GfRulesComponent } from '@ghostfolio/client/components/rules/rules.component';
import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { UpdateUserSettingDto } from '@ghostfolio/common/dtos';
import {
  PortfolioReportResponse,
  PortfolioReportRule
} from '@ghostfolio/common/interfaces';
import { User } from '@ghostfolio/common/interfaces/user.interface';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

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
    GfRulesComponent,
    IonIcon,
    NgClass,
    NgxSkeletonLoaderModule
  ],
  selector: 'gf-x-ray-page',
  styleUrl: './x-ray-page.component.scss',
  templateUrl: './x-ray-page.component.html'
})
export class GfXRayPageComponent {
  public categories: {
    key: string;
    name: string;
    rules: PortfolioReportRule[];
  }[];
  public hasImpersonationId: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public inactiveRules: PortfolioReportRule[];
  public isLoading = false;
  public statistics: PortfolioReportResponse['xRay']['statistics'];
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
      .subscribe(({ xRay: { categories, statistics } }) => {
        this.categories = categories;
        this.inactiveRules = this.mergeInactiveRules(categories);
        this.statistics = statistics;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  private mergeInactiveRules(
    categories: PortfolioReportResponse['xRay']['categories']
  ): PortfolioReportRule[] {
    return categories.flatMap(({ rules }) => {
      return (
        rules?.filter(({ isActive }) => {
          return !isActive;
        }) ?? []
      );
    });
  }
}
