import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  MatSlideToggle,
  MatSlideToggleChange
} from '@angular/material/slide-toggle';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateAccessDto } from '@ghostfolio/api/app/access/create-access.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { WebAuthnService } from '@ghostfolio/client/services/web-authn.service';
import { DEFAULT_DATE_FORMAT, baseCurrency } from '@ghostfolio/common/config';
import { Access, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { DeviceDetectorService } from 'ngx-device-detector';
import { StripeService } from 'ngx-stripe';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

import { CreateOrUpdateAccessDialog } from './create-or-update-access-dialog/create-or-update-access-dialog.component';

@Component({
  host: { class: 'mb-5' },
  selector: 'gf-account-page',
  styleUrls: ['./account-page.scss'],
  templateUrl: './account-page.html'
})
export class AccountPageComponent implements OnDestroy, OnInit {
  @ViewChild('toggleSignInWithFingerprintEnabledElement')
  signInWithFingerprintElement: MatSlideToggle;

  public accesses: Access[];
  public baseCurrency = baseCurrency;
  public coupon: number;
  public couponId: string;
  public currencies: string[] = [];
  public defaultDateFormat = DEFAULT_DATE_FORMAT;
  public deviceType: string;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToCreateAccess: boolean;
  public hasPermissionToDeleteAccess: boolean;
  public hasPermissionToUpdateViewMode: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public price: number;
  public priceId: string;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  /**
   * @constructor
   */
  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private stripeService: StripeService,
    private userService: UserService,
    public webAuthnService: WebAuthnService
  ) {
    const { currencies, globalPermissions, subscriptions } =
      this.dataService.fetchInfo();
    this.coupon = subscriptions?.[0]?.coupon;
    this.couponId = subscriptions?.[0]?.couponId;
    this.currencies = currencies;

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.hasPermissionToDeleteAccess = hasPermission(
      globalPermissions,
      permissions.deleteAccess
    );

    this.price = subscriptions?.[0]?.price;
    this.priceId = subscriptions?.[0]?.priceId;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

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

  /**
   * Initializes the controller
   */
  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.update();
  }

  public onChangeUserSettings(aKey: string, aValue: string) {
    const settings = { ...this.user.settings, [aKey]: aValue };

    this.dataService
      .putUserSettings({
        baseCurrency: settings?.baseCurrency,
        viewMode: settings?.viewMode
      })
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

  public onCheckout() {
    this.dataService
      .createCheckoutSession({ couponId: this.couponId, priceId: this.priceId })
      .pipe(
        switchMap(({ sessionId }: { sessionId: string }) => {
          return this.stripeService.redirectToCheckout({
            sessionId
          });
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

  public onRestrictedViewChange(aEvent: MatSlideToggleChange) {
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

  public onSignInWithFingerprintChange(aEvent: MatSlideToggleChange) {
    if (aEvent.checked) {
      this.registerDevice();
    } else {
      const confirmation = confirm(
        'Do you really want to remove this sign in method?'
      );

      if (confirmation) {
        this.deregisterDevice();
      } else {
        this.update();
      }
    }
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private openCreateAccessDialog(): void {
    const dialogRef = this.dialog.open(CreateOrUpdateAccessDialog, {
      data: {
        access: {
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
            .postAccess({})
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
