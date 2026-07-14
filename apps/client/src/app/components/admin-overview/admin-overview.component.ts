import { CacheService } from '@ghostfolio/client/services/cache.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  PROPERTY_COUPONS,
  PROPERTY_IS_DATA_GATHERING_ENABLED,
  PROPERTY_IS_READ_ONLY_MODE,
  PROPERTY_IS_USER_SIGNUP_ENABLED,
  PROPERTY_SYSTEM_MESSAGE,
  ghostfolioPrefix
} from '@ghostfolio/common/config';
import {
  ConfirmationDialogType,
  SubscriptionType
} from '@ghostfolio/common/enums';
import { getDateFnsLocale } from '@ghostfolio/common/helper';
import {
  Coupon,
  InfoItem,
  SystemMessage,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { AdminService, DataService } from '@ghostfolio/ui/services';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import {
  MatSlideToggleChange,
  MatSlideToggleModule
} from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import {
  addMilliseconds,
  differenceInSeconds,
  formatDistanceToNowStrict,
  parseISO
} from 'date-fns';
import { addIcons } from 'ionicons';
import {
  closeCircleOutline,
  ellipsisHorizontal,
  informationCircleOutline,
  syncOutline,
  trashOutline
} from 'ionicons/icons';
import ms, { StringValue } from 'ms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClipboardModule,
    CommonModule,
    FormsModule,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule,
    RouterModule
  ],
  selector: 'gf-admin-overview',
  styleUrls: ['./admin-overview.scss'],
  templateUrl: './admin-overview.html'
})
export class GfAdminOverviewComponent implements OnInit {
  protected activitiesCount: number;
  protected couponDuration: StringValue = '14 days';
  protected readonly couponsDataSource = new MatTableDataSource<Coupon>();
  protected readonly couponsDisplayedColumns = [
    'code',
    'duration',
    'createdAt',
    'actions'
  ];
  protected hasPermissionForSubscription: boolean;
  protected hasPermissionForSystemMessage: boolean;
  protected hasPermissionToSyncDemoUserAccount: boolean;
  protected hasPermissionToToggleReadOnlyMode: boolean;
  protected readonly info: InfoItem;
  protected isDataGatheringEnabled: boolean;
  protected isLoading = false;
  protected readonly permissions = permissions;
  protected systemMessage: SystemMessage;
  protected userCount: number;
  protected user: User;
  protected version: string;

  private readonly adminService = inject(AdminService);
  private readonly cacheService = inject(CacheService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly clipboard = inject(Clipboard);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly userService = inject(UserService);

  public constructor() {
    this.info = this.dataService.fetchInfo();

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionForSubscription = hasPermission(
            this.info.globalPermissions,
            permissions.enableSubscription
          );

          this.hasPermissionForSystemMessage = hasPermission(
            this.info.globalPermissions,
            permissions.enableSystemMessage
          );

          this.hasPermissionToSyncDemoUserAccount = hasPermission(
            this.user.permissions,
            permissions.syncDemoUserAccount
          );

          this.hasPermissionToToggleReadOnlyMode = hasPermission(
            this.user.permissions,
            permissions.toggleReadOnlyMode
          );
        }

        this.changeDetectorRef.markForCheck();
      });

    addIcons({
      closeCircleOutline,
      ellipsisHorizontal,
      informationCircleOutline,
      syncOutline,
      trashOutline
    });
  }

  protected get activitiesCountPerUser() {
    if (!this.activitiesCount || !this.userCount) {
      return undefined;
    }

    const formattedActivitiesCountPerUser = (
      this.activitiesCount / this.userCount
    ).toLocaleString(this.user?.settings?.locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });

    return `(${formattedActivitiesCountPerUser} ${$localize`per User`})`;
  }

  public ngOnInit() {
    this.fetchAdminData();
  }

  protected formatDistanceToNow(aDateString: string) {
    if (aDateString) {
      const distanceString = formatDistanceToNowStrict(parseISO(aDateString), {
        addSuffix: true
      });

      return Math.abs(differenceInSeconds(parseISO(aDateString), new Date())) <
        60
        ? 'just now'
        : distanceString;
    }

    return '';
  }

  protected formatStringValue(aStringValue: StringValue) {
    return formatDistanceToNowStrict(
      addMilliseconds(new Date(), ms(aStringValue)),
      {
        locale: getDateFnsLocale(this.user?.settings?.language)
      }
    );
  }

  protected onAddCoupon() {
    const newCoupon: Coupon = {
      code: `${ghostfolioPrefix}${this.generateCouponCode(14)}`,
      createdAt: new Date().toISOString(),
      duration: this.couponDuration
    };

    const coupons = [...this.couponsDataSource.data, newCoupon];

    this.saveCoupons({ coupons, codeToCopy: newCoupon.code });
  }

  protected onChangeCouponDuration(aCouponDuration: StringValue) {
    this.couponDuration = aCouponDuration;
  }

  protected onDeleteCoupon(aCouponCode: string) {
    this.notificationService.confirm({
      confirmFn: () => {
        const coupons = this.couponsDataSource.data.filter(({ code }) => {
          return code !== aCouponCode;
        });

        this.saveCoupons({ coupons });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this coupon?`
    });
  }

  protected onDeleteSystemMessage() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.putAdminSetting({
          key: PROPERTY_SYSTEM_MESSAGE,
          value: undefined
        });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to delete this system message?`
    });
  }

  protected onEnableDataGatheringChange(aEvent: MatSlideToggleChange) {
    this.putAdminSetting({
      key: PROPERTY_IS_DATA_GATHERING_ENABLED,
      value: aEvent.checked ? undefined : false
    });
  }

  protected onFlushCache() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.cacheService
          .flush()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            setTimeout(() => {
              window.location.reload();
            }, 300);
          });
      },
      confirmType: ConfirmationDialogType.Warn,
      title: $localize`Do you really want to flush the cache?`
    });
  }

  protected onEnableUserSignupModeChange(aEvent: MatSlideToggleChange) {
    this.putAdminSetting({
      key: PROPERTY_IS_USER_SIGNUP_ENABLED,
      value: aEvent.checked ? undefined : false
    });
  }

  protected onReadOnlyModeChange(aEvent: MatSlideToggleChange) {
    this.putAdminSetting({
      key: PROPERTY_IS_READ_ONLY_MODE,
      value: aEvent.checked ? true : undefined
    });
  }

  protected onSetSystemMessage() {
    const systemMessage = prompt(
      $localize`Please set your system message:`,
      JSON.stringify(
        this.systemMessage ??
          ({
            message: '⚒️ Scheduled maintenance in progress...',
            targetGroups: [SubscriptionType.Basic, SubscriptionType.Premium]
          } as SystemMessage)
      )
    );

    if (systemMessage) {
      this.putAdminSetting({
        key: PROPERTY_SYSTEM_MESSAGE,
        value: JSON.parse(systemMessage)
      });
    }
  }

  protected onSyncDemoUserAccount() {
    this.adminService
      .syncDemoUserAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.snackBar.open(
          '✅ ' + $localize`Demo user account has been synced.`,
          undefined,
          {
            duration: ms('3 seconds')
          }
        );
      });
  }

  private fetchAdminData() {
    this.isLoading = true;

    this.adminService
      .fetchAdminData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ activitiesCount, settings, userCount, version }) => {
        this.activitiesCount = activitiesCount;

        this.couponsDataSource.data =
          (settings[PROPERTY_COUPONS] as Coupon[]) ?? [];

        this.isDataGatheringEnabled =
          settings[PROPERTY_IS_DATA_GATHERING_ENABLED] === false ? false : true;

        this.systemMessage = settings[PROPERTY_SYSTEM_MESSAGE] as SystemMessage;
        this.userCount = userCount;
        this.version = version;

        this.isLoading = false;

        this.changeDetectorRef.markForCheck();
      });
  }

  private generateCouponCode(aLength: number) {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
    let couponCode = '';

    for (let i = 0; i < aLength; i++) {
      couponCode += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return couponCode;
  }

  private putAdminSetting({ key, value }: { key: string; value: any }) {
    this.dataService
      .putAdminSetting(key, {
        value: value || value === false ? JSON.stringify(value) : undefined
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
  }

  private saveCoupons({
    codeToCopy,
    coupons
  }: {
    codeToCopy?: string;
    coupons: Coupon[];
  }) {
    this.dataService
      .putAdminSetting(PROPERTY_COUPONS, {
        value: JSON.stringify(coupons)
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.couponsDataSource.data = coupons;

        if (codeToCopy) {
          this.clipboard.copy(codeToCopy);

          this.snackBar.open(
            '✅ ' + $localize`${codeToCopy} has been copied to the clipboard`,
            undefined,
            { duration: ms('3 seconds') }
          );
        }

        this.changeDetectorRef.markForCheck();
      });
  }
}
