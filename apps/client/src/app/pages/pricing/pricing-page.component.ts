import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { translate } from '@ghostfolio/ui/i18n';

import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { StringValue } from 'ms';
import { StripeService } from 'ngx-stripe';
import { Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  selector: 'gf-pricing-page',
  styleUrls: ['./pricing-page.scss'],
  templateUrl: './pricing-page.html',
  standalone: false
})
export class PricingPageComponent implements OnDestroy, OnInit {
  public baseCurrency: string;
  public coupon: number;
  public couponId: string;
  public durationExtension: StringValue;
  public hasPermissionToUpdateUserSettings: boolean;
  public importAndExportTooltipBasic = translate(
    'DATA_IMPORT_AND_EXPORT_TOOLTIP_BASIC'
  );
  public importAndExportTooltipOSS = translate(
    'DATA_IMPORT_AND_EXPORT_TOOLTIP_OSS'
  );
  public importAndExportTooltipPremium = translate(
    'DATA_IMPORT_AND_EXPORT_TOOLTIP_PREMIUM'
  );
  public isLoggedIn: boolean;
  public label: string;
  public price: number;
  public priceId: string;
  public professionalDataProviderTooltipPremium = translate(
    'PROFESSIONAL_DATA_PROVIDER_TOOLTIP_PREMIUM'
  );
  public routerLinkFeatures = ['/' + $localize`:snake-case:features`];
  public routerLinkRegister = ['/' + $localize`:snake-case:register`];
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private notificationService: NotificationService,
    private stripeService: StripeService,
    private userService: UserService
  ) {}

  public ngOnInit() {
    const { baseCurrency } = this.dataService.fetchInfo();
    this.baseCurrency = baseCurrency;

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        if (state?.user) {
          this.user = state.user;

          this.hasPermissionToUpdateUserSettings = hasPermission(
            this.user.permissions,
            permissions.updateUserSettings
          );

          this.coupon = this.user?.subscription?.offer?.coupon;
          this.couponId = this.user?.subscription?.offer?.couponId;
          this.durationExtension =
            this.user?.subscription?.offer?.durationExtension;
          this.label = this.user?.subscription?.offer?.label;
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
        switchMap(({ sessionId }: { sessionId: string }) => {
          return this.stripeService.redirectToCheckout({ sessionId });
        }),
        catchError((error) => {
          this.notificationService.alert({
            title: error.message
          });

          throw error;
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

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
