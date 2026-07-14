import { UserService } from '@ghostfolio/client/services/user/user.service';
import { E_MAIL_LINE_BREAK } from '@ghostfolio/common/config';
import { ConfirmationDialogType } from '@ghostfolio/common/enums';
import { getDateFormatString } from '@ghostfolio/common/helper';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { GfMembershipCardComponent } from '@ghostfolio/ui/membership-card';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import ms, { StringValue } from 'ms';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    GfMembershipCardComponent,
    GfPremiumIndicatorComponent,
    MatButtonModule,
    MatCardModule,
    RouterModule
  ],
  selector: 'gf-user-account-membership',
  styleUrls: ['./user-account-membership.scss'],
  templateUrl: './user-account-membership.html'
})
export class GfUserAccountMembershipComponent {
  protected readonly baseCurrency: string;
  protected coupon: number | undefined;
  protected defaultDateFormat: string;
  protected durationExtension: StringValue | undefined;
  protected readonly hasPermissionForSubscription: boolean;
  protected hasPermissionToCreateApiKey: boolean;
  protected hasPermissionToUpdateUserSettings: boolean;
  protected price: number;
  protected readonly trySubscriptionMailHref = `mailto:hi@ghostfol.io?subject=Ghostfolio Premium Trial&body=${[
    'Hello',
    '',
    'I am interested in Ghostfolio Premium. Can you please send me a coupon code to try it for some time?',
    '',
    'Kind regards'
  ].join(E_MAIL_LINE_BREAK)}`;
  protected user: User;

  private couponId: string | undefined;
  private priceId: string;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly userService = inject(UserService);

  public constructor() {
    const { baseCurrency, globalPermissions } = this.dataService.fetchInfo();

    this.baseCurrency = baseCurrency;

    this.hasPermissionForSubscription = hasPermission(
      globalPermissions,
      permissions.enableSubscription
    );

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
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

  protected onCheckout() {
    this.dataService
      .createStripeCheckoutSession({
        couponId: this.couponId,
        priceId: this.priceId
      })
      .pipe(
        catchError((error: Error) => {
          this.notificationService.alert({
            title: error.message
          });

          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ sessionUrl }) => {
        window.location.href = sessionUrl;
      });
  }

  protected onGenerateApiKey() {
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
            takeUntilDestroyed(this.destroyRef)
          )
          .subscribe(({ apiKey }) => {
            this.notificationService.alert({
              copyValue: apiKey,
              discardLabel: $localize`Close`,
              message: $localize`Set this API key in your self-hosted environment:`,
              title: $localize`Ghostfolio Premium Data Provider API Key`
            });
          });
      },
      confirmType: ConfirmationDialogType.Primary,
      title: $localize`Do you really want to generate a new API key?`
    });
  }

  protected onRedeemCoupon() {
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
              takeUntilDestroyed(this.destroyRef)
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
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                  window.location.reload();
                });

              snackBarRef
                .onAction()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                  window.location.reload();
                });
            });
        }
      },
      title: $localize`Please enter your coupon code.`
    });
  }
}
