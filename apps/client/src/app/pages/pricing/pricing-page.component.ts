import { UserService } from '@ghostfolio/client/services/user/user.service';
import { User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { translate } from '@ghostfolio/ui/i18n';
import { NotificationService } from '@ghostfolio/ui/notifications';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
export class GfPricingPageComponent implements OnInit {
  public baseCurrency: string;
  public coupon: number | undefined;
  public couponId: string | undefined;
  public durationExtension: StringValue | undefined;
  public hasPermissionToCreateUser: boolean;
  public hasPermissionToUpdateUserSettings: boolean;

  public readonly importAndExportTooltipBasic = translate(
    'DATA_IMPORT_AND_EXPORT_TOOLTIP_BASIC'
  );

  public readonly importAndExportTooltipOSS = translate(
    'DATA_IMPORT_AND_EXPORT_TOOLTIP_OSS'
  );

  public label: string | undefined;
  public price: number | undefined;
  public priceId: string;

  public readonly professionalDataProviderTooltipPremium = translate(
    'PROFESSIONAL_DATA_PROVIDER_TOOLTIP_PREMIUM'
  );

  public readonly referralBrokers = [
    'Alpian',
    'DEGIRO',
    'finpension',
    'frankly',
    'Interactive Brokers',
    'Mintos',
    'Monefit SmartSaver',
    'Swissquote',
    'VIAC',
    'Zak'
  ] as const;

  public readonly routerLinkFeatures = publicRoutes.features.routerLink;
  public readonly routerLinkRegister = publicRoutes.register.routerLink;
  public user: User;

  public constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly dataService: DataService,
    private readonly destroyRef: DestroyRef,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService
  ) {
    addIcons({
      checkmarkCircleOutline,
      checkmarkOutline,
      informationCircleOutline
    });
  }

  public ngOnInit() {
    const { baseCurrency, globalPermissions, subscriptionOffer } =
      this.dataService.fetchInfo();

    this.baseCurrency = baseCurrency;
    this.coupon = subscriptionOffer?.coupon;
    this.durationExtension = subscriptionOffer?.durationExtension;

    this.hasPermissionToCreateUser = hasPermission(
      globalPermissions,
      permissions.createUserAccount
    );

    this.label = subscriptionOffer?.label;
    this.price = subscriptionOffer?.price;

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
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
}
