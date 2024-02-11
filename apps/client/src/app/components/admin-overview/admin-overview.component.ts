import { AdminService } from '@ghostfolio/client/services/admin.service';
import { CacheService } from '@ghostfolio/client/services/cache.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import {
  PROPERTY_COUPONS,
  PROPERTY_CURRENCIES,
  PROPERTY_IS_DATA_GATHERING_ENABLED,
  PROPERTY_IS_READ_ONLY_MODE,
  PROPERTY_IS_USER_SIGNUP_ENABLED,
  PROPERTY_SYSTEM_MESSAGE,
  ghostfolioPrefix
} from '@ghostfolio/common/config';
import {
  Coupon,
  InfoItem,
  SystemMessage,
  User
} from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import {
  differenceInSeconds,
  formatDistanceToNowStrict,
  parseISO
} from 'date-fns';
import { uniq } from 'lodash';
import { StringValue } from 'ms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'gf-admin-overview',
  styleUrls: ['./admin-overview.scss'],
  templateUrl: './admin-overview.html'
})
export class AdminOverviewComponent implements OnDestroy, OnInit {
  public couponDuration: StringValue = '14 days';
  public coupons: Coupon[];
  public customCurrencies: string[];
  public exchangeRates: { label1: string; label2: string; value: number }[];
  public hasPermissionForSubscription: boolean;
  public hasPermissionForSystemMessage: boolean;
  public hasPermissionToToggleReadOnlyMode: boolean;
  public info: InfoItem;
  public isDataGatheringEnabled: boolean;
  public permissions = permissions;
  public systemMessage: SystemMessage;
  public transactionCount: number;
  public userCount: number;
  public user: User;
  public version: string;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private adminService: AdminService,
    private cacheService: CacheService,
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private userService: UserService
  ) {
    this.info = this.dataService.fetchInfo();

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
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

          this.hasPermissionToToggleReadOnlyMode = hasPermission(
            this.user.permissions,
            permissions.toggleReadOnlyMode
          );
        }
      });
  }

  public ngOnInit() {
    this.fetchAdminData();
  }

  public formatDistanceToNow(aDateString: string) {
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

  public onAddCoupon() {
    const coupons = [
      ...this.coupons,
      {
        code: `${ghostfolioPrefix}${this.generateCouponCode(14)}`,
        duration: this.couponDuration
      }
    ];
    this.putAdminSetting({ key: PROPERTY_COUPONS, value: coupons });
  }

  public onAddCurrency() {
    const currency = prompt($localize`Please add a currency:`);

    if (currency) {
      if (currency.length === 3) {
        const currencies = uniq([...this.customCurrencies, currency]);
        this.putAdminSetting({ key: PROPERTY_CURRENCIES, value: currencies });
      } else {
        alert($localize`${currency} is an invalid currency!`);
      }
    }
  }

  public onChangeCouponDuration(aCouponDuration: StringValue) {
    this.couponDuration = aCouponDuration;
  }

  public onDeleteCoupon(aCouponCode: string) {
    const confirmation = confirm(
      $localize`Do you really want to delete this coupon?`
    );

    if (confirmation === true) {
      const coupons = this.coupons.filter((coupon) => {
        return coupon.code !== aCouponCode;
      });
      this.putAdminSetting({ key: PROPERTY_COUPONS, value: coupons });
    }
  }

  public onDeleteCurrency(aCurrency: string) {
    const confirmation = confirm(
      $localize`Do you really want to delete this currency?`
    );

    if (confirmation === true) {
      const currencies = this.customCurrencies.filter((currency) => {
        return currency !== aCurrency;
      });
      this.putAdminSetting({ key: PROPERTY_CURRENCIES, value: currencies });
    }
  }

  public onDeleteSystemMessage() {
    const confirmation = confirm(
      $localize`Do you really want to delete this system message?`
    );

    if (confirmation === true) {
      this.putAdminSetting({ key: PROPERTY_SYSTEM_MESSAGE, value: undefined });
    }
  }

  public onEnableDataGatheringChange(aEvent: MatSlideToggleChange) {
    this.putAdminSetting({
      key: PROPERTY_IS_DATA_GATHERING_ENABLED,
      value: aEvent.checked ? undefined : false
    });
  }

  public onFlushCache() {
    const confirmation = confirm(
      $localize`Do you really want to flush the cache?`
    );

    if (confirmation === true) {
      this.cacheService
        .flush()
        .pipe(takeUntil(this.unsubscribeSubject))
        .subscribe(() => {
          setTimeout(() => {
            window.location.reload();
          }, 300);
        });
    }
  }

  public onEnableUserSignupModeChange(aEvent: MatSlideToggleChange) {
    this.putAdminSetting({
      key: PROPERTY_IS_USER_SIGNUP_ENABLED,
      value: aEvent.checked ? undefined : false
    });
  }

  public onReadOnlyModeChange(aEvent: MatSlideToggleChange) {
    this.putAdminSetting({
      key: PROPERTY_IS_READ_ONLY_MODE,
      value: aEvent.checked ? true : undefined
    });
  }

  public onSetSystemMessage() {
    const systemMessage = prompt(
      $localize`Please set your system message:`,
      JSON.stringify(
        this.systemMessage ??
          <SystemMessage>{
            message: '⚒️ Scheduled maintenance in progress...',
            targetGroups: ['Basic', 'Premium']
          }
      )
    );

    if (systemMessage) {
      this.putAdminSetting({
        key: PROPERTY_SYSTEM_MESSAGE,
        value: JSON.parse(systemMessage)
      });
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private fetchAdminData() {
    this.adminService
      .fetchAdminData()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(
        ({ exchangeRates, settings, transactionCount, userCount, version }) => {
          this.coupons = (settings[PROPERTY_COUPONS] as Coupon[]) ?? [];
          this.customCurrencies = settings[PROPERTY_CURRENCIES] as string[];
          this.exchangeRates = exchangeRates;
          this.isDataGatheringEnabled =
            settings[PROPERTY_IS_DATA_GATHERING_ENABLED] === false
              ? false
              : true;
          this.systemMessage = settings[
            PROPERTY_SYSTEM_MESSAGE
          ] as SystemMessage;
          this.transactionCount = transactionCount;
          this.userCount = userCount;
          this.version = version;

          this.changeDetectorRef.markForCheck();
        }
      );
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
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
  }
}
