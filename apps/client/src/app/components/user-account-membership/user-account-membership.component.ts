import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar
} from '@angular/material/snack-bar';
import { StripeService } from 'ngx-stripe';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-user-account-membership',
  styleUrls: ['./user-account-membership.scss'],
  templateUrl: './user-account-membership.html'
})
export class UserAccountMembershipComponent implements OnDestroy, OnInit {
  public baseCurrency: string;
  public coupon: number;
  public couponId: string;
  public defaultDateFormat: string;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public price: number;
  public priceId: string;
  public routerLinkPricing = ['/' + $localize`pricing`];
  public snackBarRef: MatSnackBarRef<TextOnlySnackBar>;
  public trySubscriptionMail =
    'mailto:hi@ghostfol.io?Subject=Ghostfolio Premium Trial&body=Hello%0D%0DI am interested in Ghostfolio Premium. Can you please send me a coupon code to try it for some time?%0D%0DKind regards';
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private snackBar: MatSnackBar,
    private stripeService: StripeService,
    private userService: UserService
  ) {
    const { baseCurrency, globalPermissions, subscriptions } =
      this.dataService.fetchInfo();

    this.baseCurrency = baseCurrency;

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.defaultDateFormat = getDateFormatString(
            this.user.settings.locale
          );

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          this.coupon = subscriptions?.[this.user.subscription.offer]?.coupon;
          this.couponId =
            subscriptions?.[this.user.subscription.offer]?.couponId;
          this.price = subscriptions?.[this.user.subscription.offer]?.price;
          this.priceId = subscriptions?.[this.user.subscription.offer]?.priceId;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public ngOnInit() {}

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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
