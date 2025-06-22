import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { PROPERTY_API_KEY_GHOSTFOLIO } from '@ghostfolio/common/config';
import { getDateFormatString } from '@ghostfolio/common/helper';
import {
  DataProviderGhostfolioStatusResponse,
  DataProviderInfo,
  User
} from '@ghostfolio/common/interfaces';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { catchError, filter, of, Subject, takeUntil } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-settings',
  styleUrls: ['./admin-settings.component.scss'],
  templateUrl: './admin-settings.component.html',
  standalone: false
})
export class AdminSettingsComponent implements OnDestroy, OnInit {
  public dataSource = new MatTableDataSource<DataProviderInfo>();
  public defaultDateFormat: string;
  public displayedColumns = [
    'name',
    'status',
    'assetProfileCount',
    'usage',
    'actions'
  ];
  public ghostfolioApiStatus: DataProviderGhostfolioStatusResponse;
  public isGhostfolioApiKeyValid: boolean;
  public isLoading = false;
  public pricingUrl: string;

  private unsubscribeSubject = new Subject<void>();
  private user: User;

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private notificationService: NotificationService,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.defaultDateFormat = getDateFormatString(
            this.user.settings.locale
          );

          const languageCode = this.user.settings.language;

          this.pricingUrl = `https://ghostfol.io/${languageCode}/${publicRoutes.pricing.path}`;

          this.changeDetectorRef.markForCheck();
        }
      });

    this.initialize();
  }

  public isGhostfolioDataProvider(provider: DataProviderInfo): boolean {
    return provider.dataSource === 'GHOSTFOLIO';
  }

  public onRemoveGhostfolioApiKey() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.dataService
          .putAdminSetting(PROPERTY_API_KEY_GHOSTFOLIO, { value: undefined })
          .subscribe(() => {
            this.initialize();
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete the API key?`
    });
  }

  public onSetGhostfolioApiKey() {
    this.notificationService.prompt({
      confirmFn: (value) => {
        const ghostfolioApiKey = value?.trim();

        if (ghostfolioApiKey) {
          this.dataService
            .putAdminSetting(PROPERTY_API_KEY_GHOSTFOLIO, {
              value: ghostfolioApiKey
            })
            .subscribe(() => {
              this.initialize();
            });
        }
      },
      title: $localize`Please enter your Ghostfolio API key.`
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private initialize() {
    this.isLoading = true;

    this.dataSource = new MatTableDataSource();

    this.adminService
      .fetchAdminData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(({ dataProviders, settings }) => {
        const filteredProviders = dataProviders.filter(({ dataSource }) => {
          return dataSource !== 'MANUAL';
        });

        this.dataSource = new MatTableDataSource(filteredProviders);

        const ghostfolioApiKey = settings[
          PROPERTY_API_KEY_GHOSTFOLIO
        ] as string;

        if (ghostfolioApiKey) {
          this.adminService
            .fetchGhostfolioDataProviderStatus(ghostfolioApiKey)
            .pipe(
              catchError(() => {
                this.isGhostfolioApiKeyValid = false;

                this.changeDetectorRef.markForCheck();

                return of(null);
              }),
              filter((status) => {
                return status !== null;
              }),
              takeUntil(this.unsubscribeSubject)
            )
            .subscribe((status) => {
              this.ghostfolioApiStatus = status;
              this.isGhostfolioApiKeyValid = true;

              this.changeDetectorRef.markForCheck();
            });
        } else {
          this.isGhostfolioApiKeyValid = false;
        }

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
