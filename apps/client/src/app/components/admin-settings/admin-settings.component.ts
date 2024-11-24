import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { AdminService } from '@ghostfolio/client/services/admin.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { PROPERTY_API_KEY_GHOSTFOLIO } from '@ghostfolio/common/config';
import {
  DataProviderGhostfolioStatusResponse,
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
import { DeviceDetectorService } from 'ngx-device-detector';
import { catchError, filter, of, Subject, takeUntil } from 'rxjs';

import { GfGhostfolioPremiumApiDialogComponent } from './ghostfolio-premium-api-dialog/ghostfolio-premium-api-dialog.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-admin-settings',
  styleUrls: ['./admin-settings.component.scss'],
  templateUrl: './admin-settings.component.html'
})
export class AdminSettingsComponent implements OnDestroy, OnInit {
  public ghostfolioApiStatus: DataProviderGhostfolioStatusResponse;
  public hasGhostfolioApiKey: boolean;
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

          this.pricingUrl =
            `https://ghostfol.io/${this.user.settings.language}/` +
            $localize`:snake-case:pricing`;

          this.changeDetectorRef.markForCheck();
        }
      });

    this.initialize();
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
        },
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
    this.adminService
      .fetchGhostfolioDataProviderStatus()
      .pipe(
        catchError(() => {
          this.hasGhostfolioApiKey = false;

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
        this.hasGhostfolioApiKey = true;

        this.changeDetectorRef.markForCheck();
      });
  }
}
