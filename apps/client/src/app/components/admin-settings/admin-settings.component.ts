import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  DEFAULT_LANGUAGE_CODE,
  PROPERTY_API_KEY_GHOSTFOLIO
} from '@ghostfolio/common/config';
import { getDateFormatString } from '@ghostfolio/common/helper';
import {
  DataProviderGhostfolioStatusResponse,
  DataProviderInfo,
  User
} from '@ghostfolio/common/interfaces';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { DeviceDetectorService } from 'ngx-device-detector';
import { catchError, filter, of, Subject, takeUntil } from 'rxjs';

import { GfGhostfolioPremiumApiDialogComponent } from './ghostfolio-premium-api-dialog/ghostfolio-premium-api-dialog.component';
import { GhostfolioPremiumApiDialogParams } from './ghostfolio-premium-api-dialog/interfaces/interfaces';

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
  public displayedColumns = ['name', 'assetProfileCount', 'status', 'actions'];
  public ghostfolioApiStatus: DataProviderGhostfolioStatusResponse;
  public isGhostfolioApiKeyValid: boolean;
  public isLoading = false;
  public pricingUrl: string;

  private deviceType: string;
  private unsubscribeSubject = new Subject<void>();
  private user: User;

  public constructor(
    private adminService: AdminService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private matDialog: MatDialog,
    private notificationService: NotificationService,
    private userService: UserService
  ) {}

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.defaultDateFormat = getDateFormatString(
            this.user?.settings?.locale
          );

          const languageCode =
            this.user?.settings?.language ?? DEFAULT_LANGUAGE_CODE;

          this.pricingUrl =
            `https://ghostfol.io/${languageCode}/` +
            $localize`:snake-case:pricing`;

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
    const dialogRef = this.matDialog.open(
      GfGhostfolioPremiumApiDialogComponent,
      {
        autoFocus: false,
        data: {
          deviceType: this.deviceType,
          pricingUrl: this.pricingUrl
        } as GhostfolioPremiumApiDialogParams,
        height: this.deviceType === 'mobile' ? '98vh' : undefined,
        width: this.deviceType === 'mobile' ? '100vw' : '50rem'
      }
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.initialize();
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

        this.adminService
          .fetchGhostfolioDataProviderStatus(
            settings[PROPERTY_API_KEY_GHOSTFOLIO] as string
          )
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

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }
}
