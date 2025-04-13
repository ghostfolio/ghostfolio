import { ConfirmationDialogType } from '@ghostfolio/client/core/notification/confirmation-dialog/confirmation-dialog.type';
import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import ms, { StringValue } from 'ms';
import { StripeService } from 'ngx-stripe';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-user-account-membership',
  styleUrls: ['./user-account-membership.scss'],
  templateUrl: './user-account-membership.html',
  standalone: false
})
export class UserAccountMembershipComponent implements OnDestroy {
  public baseCurrency: string;
  public coupon: number;
  public couponId: string;
  public defaultDateFormat: string;
  public durationExtension: StringValue;
  public hasPermissionForSubscription: boolean;
  public hasPermissionToCreateApiKey: boolean;
  public hasPermissionToUpdateUserSettings: boolean;
  public price: number;
  public priceId: string;
  public routerLinkPricing = ['/' + $localize`:snake-case:pricing`];
  public trySubscriptionMail =
    'mailto:hi@ghostfol.io?Subject=Ghostfolio Premium Trial&body=Hello%0D%0DI am interested in Ghostfolio Premium. Can you please send me a coupon code to try it for some time?%0D%0DKind regards';
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    private stripeService: StripeService,
    private userService: UserService
  ) {
    const { baseCurrency, globalPermissions } = this.dataService.fetchInfo();

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

          this.hasPermissionToCreateApiKey = hasPermission(
            this.user.permissions,
            permissions.createApiKey
          );

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          this.coupon = this.user?.subscription?.offer?.coupon;
          this.couponId = this.user?.subscription?.offer?.couponId;
          this.durationExtension =
            this.user?.subscription?.offer?.durationExtension;
          this.price = this.user?.subscription?.offer?.price;
          this.priceId = this.user?.subscription?.offer?.priceId;

          this.changeDetectorRef.markForCheck();
        }
      });
  }

  public onCheckout() {
    this.dataService
      .createCheckoutSession({ couponId: this.couponId, priceId: this.priceId })
      .pipe(
        catchError((error) => {
          this.notificationService.alert({
            title: error.message
          });

          throw error;
        }),
        switchMap(({ sessionId }: { sessionId: string }) => {
          return this.stripeService.redirectToCheckout({ sessionId });
        })
      )
      .subscribe((result) => {
        if (result.error) {
          this.notificationService.alert({
            title: result.error.message
          });
        }
      });
  }

  public onGenerateApiKey() {
    this.notificationService.confirm({
      confirmFn: () => {
        this.dataService
          .postApiKey()
          .pipe(
            catchError(() => {
              this.snackBar.open(
                '😞 ' + $localize`Could not generate an API key`,
                undefined,
                {
                  duration: ms('3 seconds')
                }
              );

              return EMPTY;
            }),
            takeUntil(this.unsubscribeSubject)
          )
          .subscribe(({ apiKey }) => {
            this.notificationService.alert({
              discardLabel: $localize`Okay`,
              message:
                $localize`Set this API key in your self-hosted environment:` +
                '<br />' +
                apiKey,
              title: $localize`Ghostfolio Premium Data Provider API Key`
            });
          });
      },
      confirmType: ConfirmationDialogType.Primary,
      title: $localize`Do you really want to generate a new API key?`
    });
  }

  public onRedeemCoupon() {
    this.notificationService.prompt({
      confirmFn: (value) => {
        const couponCode = value?.trim();

        if (couponCode) {
          this.dataService
            .redeemCoupon(couponCode)
            .pipe(
              catchError(() => {
                this.snackBar.open(
                  '😞 ' + $localize`Could not redeem coupon code`,
                  undefined,
                  {
                    duration: ms('3 seconds')
                  }
                );

                return EMPTY;
              }),
              takeUntil(this.unsubscribeSubject)
            )
            .subscribe(() => {
              const snackBarRef = this.snackBar.open(
                '✅ ' + $localize`Coupon code has been redeemed`,
                $localize`Reload`,
                {
                  duration: ms('3 seconds')
                }
              );

              snackBarRef
                .afterDismissed()
                .pipe(takeUntil(this.unsubscribeSubject))
                .subscribe(() => {
                  window.location.reload();
                });

              snackBarRef
                .onAction()
                .pipe(takeUntil(this.unsubscribeSubject))
                .subscribe(() => {
                  window.location.reload();
                });
            });
        }
      },
      title: $localize`Please enter your coupon code.`
    });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
