import { NotificationService } from '@ghostfolio/client/core/notification/notification.service';
import { DataService } from '@ghostfolio/client/services/data.service';
import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { translate } from '@ghostfolio/ui/i18n';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  checkmarkOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { StringValue } from 'ms';
import { StripeService } from 'ngx-stripe';
import { Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

@Component({
  host: { class: 'page' },
  imports: [
    CommonModule,
    GfPremiumIndicatorComponent,
    IonIcon,
    MatButtonModule,
    MatCardModule,
    MatTooltipModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-pricing-page',
  styleUrls: ['./pricing-page.scss'],
  templateUrl: './pricing-page.html'
})
export class GfPricingPageComponent implements OnDestroy, OnInit {
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
  public referralBrokers = [
    'DEGIRO',
    'finpension',
    'frankly',
    'Interactive Brokers',
    'Mintos',
    'Swissquote',
    'VIAC',
    'Zak'
  ];
  public routerLinkFeatures = publicRoutes.features.routerLink;
  public routerLinkRegister = publicRoutes.register.routerLink;
  public user: User;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private notificationService: NotificationService,
    private stripeService: StripeService,
    private userService: UserService
  ) {
    addIcons({
      checkmarkCircleOutline,
      checkmarkOutline,
      informationCircleOutline
    });
  }

  public ngOnInit() {
    const { baseCurrency, subscriptionOffer } = this.dataService.fetchInfo();
    this.baseCurrency = baseCurrency;

    this.coupon = subscriptionOffer?.coupon;
    this.durationExtension = subscriptionOffer?.durationExtension;
    this.label = subscriptionOffer?.label;
    this.price = subscriptionOffer?.price;

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
      .createStripeCheckoutSession({
        couponId: this.couponId,
        priceId: this.priceId
      })
      .pipe(
        switchMap(({ sessionId }) => {
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
