import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar
} from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import {
  STAY_SIGNED_IN,
  SettingsStorageService
} from '@ghostfolio/client/services/settings-storage.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { downloadAsFile, getDateFormatString } from '@ghostfolio/common/helper';
import { Access, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { format, parseISO } from 'date-fns';
import { uniq } from 'lodash';
import { DeviceDetectorService } from 'ngx-device-detector';
import { StripeService } from 'ngx-stripe';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

import { CreateOrUpdateAccessDialog } from './create-or-update-access-dialog/create-or-update-access-dialog.component';

@Component({
  host: { class: 'page' },
  selector: 'gf-user-account-page',
  styleUrls: ['./user-account-page.scss'],
  templateUrl: './user-account-page.html'
})
export class UserAccountPageComponent implements OnDestroy, OnInit {
  @ViewChild('toggleSignInWithFingerprintEnabledElement')
  signInWithFingerprintElement: MatCheckbox;

  public accesses: Access[];
  public appearancePlaceholder = $localize`Auto`;
  public baseCurrency: string;
  public coupon: number;
  public couponId: string;
  public currencies: string[] = [];
  public defaultDateFormat: string;
  public deviceType: string;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToCreateAccess: boolean;
  public hasPermissionToDeleteAccess: boolean;
  public hasPermissionToUpdateViewMode: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public language = document.documentElement.lang;
  public locales = [
    'de',
    'de-CH',
    'en-GB',
    'en-US',
    'es',
    'fr',
    'it',
    'nl',
    'pt',
    'tr'
  ];
  public price: number;
  public priceId: string;
  public snackBarRef: MatSnackBarRef<TextOnlySnackBar>;
  public trySubscriptionMail =
    'mailto:hi@ghostfol.io?Subject=Ghostfolio Premium Trial&body=Hello%0D%0DI am interested in Ghostfolio Premium. Can you please send me a coupon code to try it for some time?%0D%0DKind regards';
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private settingsStorageService: SettingsStorageService,
    private stripeService: StripeService,
    private userService: UserService,
    public webAuthnService: WebAuthnService
  ) {
    const { baseCurrency, currencies, globalPermissions, subscriptions } =
      this.dataService.fetchInfo();

    this.baseCurrency = baseCurrency;
    this.currencies = currencies;

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.hasPermissionToDeleteAccess = hasPermission(
      globalPermissions,
      permissions.deleteAccess
    );

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.defaultDateFormat = getDateFormatString(
            this.user.settings.locale
          );

          this.hasPermissionToCreateAccess = hasPermission(
            this.user.permissions,
            permissions.createAccess
          );

          this.hasPermissionToDeleteAccess = hasPermission(
            this.user.permissions,
            permissions.deleteAccess
          );

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          this.hasPermissionToUpdateViewMode = hasPermission(
            this.user.permissions,
            permissions.updateViewMode
          );

          this.locales.push(this.user.settings.locale);
          this.locales = uniq(this.locales.sort());

          this.coupon = subscriptions?.[this.user.subscription.offer]?.coupon;
          this.couponId =
            subscriptions?.[this.user.subscription.offer]?.couponId;
          this.price = subscriptions?.[this.user.subscription.offer]?.price;
          this.priceId = subscriptions?.[this.user.subscription.offer]?.priceId;

          this.changeDetectorRef.markForCheck();
        }
      });

    this.route.queryParams
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((params) => {
        if (params['createDialog']) {
          this.openCreateAccessDialog();
        }
      });
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.update();
  }

  public onChangeUserSetting(aKey: string, aValue: string) {
    this.dataService
      .putUserSetting({ [aKey]: aValue })
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe(() => {
        this.userService.remove();

        this.userService
          .get()
          .pipe(takeUntil(this.unsubscribeSubject))
          .subscribe((user) => {
            this.user = user;

            this.changeDetectorRef.markForCheck();

            if (aKey === 'language') {
              if (aValue) {
                window.location.href = `../${aValue}/account`;
              } else {
                window.location.href = `../`;
              }
            }
          });
      });
  }

  public onCheckout() {
    this.dataService
      .createCheckoutSession({ couponId: this.couponId, priceId: this.priceId })
      .pipe(
        switchMap(({ sessionId }: { sessionId: string }) => {
          return this.stripeService.redirectToCheckout({ sessionId });
        }),
        catchError((error) => {
          alert(error.message);
          throw error;
        })
      )
      .subscribe((result) => {
        if (result.error) {
          alert(result.error.message);
        }
      });
  }

  public onDeleteAccess(aId: string) {
    this.dataService
      .deleteAccess(aId)
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe({
        next: () => {
          this.update();
        }
      });
  }

  public onExperimentalFeaturesChange(aEvent: MatCheckboxChange) {
    this.dataService
      .putUserSetting({ isExperimentalFeatures: aEvent.checked })
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

  public onExport() {
    this.dataService
      .fetchExport()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data) => {
        for (const activity of data.activities) {
          delete activity.id;
        }

        downloadAsFile({
          content: data,
          fileName: `ghostfolio-export-${format(
            parseISO(data.meta.date),
            'yyyyMMddHHmm'
          )}.json`,
          format: 'json'
        });
      });
  }

  public onRedeemCoupon() {
    let couponCode = prompt($localize`Please enter your coupon code:`);
    couponCode = couponCode?.trim();

    if (couponCode) {
      this.dataService
        .redeemCoupon(couponCode)
        .pipe(
          takeUntil(this.unsubscribeSubject),
          catchError(() => {
            this.snackBar.open(
              '😞 ' + $localize`Could not redeem coupon code`,
              undefined,
              {
                duration: 3000
              }
            );

            return EMPTY;
          })
        )
        .subscribe(() => {
          this.snackBarRef = this.snackBar.open(
            '✅ ' + $localize`Coupon code has been redeemed`,
            $localize`Reload`,
            {
              duration: 3000
            }
          );

          this.snackBarRef
            .afterDismissed()
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe(() => {
              window.location.reload();
            });

          this.snackBarRef
            .onAction()
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe(() => {
              window.location.reload();
            });
        });
    }
  }

  public onRestrictedViewChange(aEvent: MatCheckboxChange) {
    this.dataService
      .putUserSetting({ isRestrictedView: aEvent.checked })
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

  public onSignInWithFingerprintChange(aEvent: MatCheckboxChange) {
    if (aEvent.checked) {
      this.registerDevice();
    } else {
      const confirmation = confirm(
        $localize`Do you really want to remove this sign in method?`
      );

      if (confirmation) {
        this.deregisterDevice();
      } else {
        this.update();
      }
    }
  }

  public onViewModeChange(aEvent: MatCheckboxChange) {
    this.dataService
      .putUserSetting({ viewMode: aEvent.checked === true ? 'ZEN' : 'DEFAULT' })
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

  private openCreateAccessDialog(): void {
    const dialogRef = this.dialog.open(CreateOrUpdateAccessDialog, {
      data: {
        access: {
          alias: '',
          type: 'PUBLIC'
        }
      },
      height: this.deviceType === 'mobile' ? '97.5vh' : '80vh',
      width: this.deviceType === 'mobile' ? '100vw' : '50rem'
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((data: any) => {
        const access: CreateAccessDto = data?.access;

        if (access) {
          this.dataService
            .postAccess({ alias: access.alias })
            .pipe(takeUntil(this.unsubscribeSubject))
            .subscribe({
              next: () => {
                this.update();
              }
            });
        }

        this.router.navigate(['.'], { relativeTo: this.route });
      });
  }

  private deregisterDevice() {
    this.webAuthnService
      .deregister()
      .pipe(
        takeUntil(this.unsubscribeSubject),
        catchError(() => {
          this.update();

          return EMPTY;
        })
      )
      .subscribe(() => {
        this.update();
      });
  }

  private registerDevice() {
    this.webAuthnService
      .register()
      .pipe(
        takeUntil(this.unsubscribeSubject),
        catchError(() => {
          this.update();

          return EMPTY;
        })
      )
      .subscribe(() => {
        this.settingsStorageService.removeSetting(STAY_SIGNED_IN);

        this.update();
      });
  }

  private update() {
    this.dataService
      .fetchAccesses()
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((response) => {
        this.accesses = response;

        if (this.signInWithFingerprintElement) {
          this.signInWithFingerprintElement.checked =
            this.webAuthnService.isEnabled() ?? false;
        }

        this.changeDetectorRef.markForCheck();
      });
  }
}
