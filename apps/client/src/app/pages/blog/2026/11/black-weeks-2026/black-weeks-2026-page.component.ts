import { UserService } from '@ghostfolio/client/services/user/user.service';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { SubscriptionOffer } from '@ghostfolio/common/interfaces';
import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { DataService } from '@ghostfolio/ui/services';

import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [
    DecimalPipe,
    GfPremiumIndicatorComponent,
    MatButtonModule,
    RouterModule
  ],
  selector: 'gf-black-weeks-2026-page',
  templateUrl: './black-weeks-2026-page.html'
})
export class BlackWeeks2026PageComponent implements OnInit {
  public baseCurrency: string;
  public price: number | undefined;
  public routerLinkBlog = publicRoutes.blog.routerLink;
  public routerLinkFeatures = publicRoutes.features.routerLink;
  public routerLinkPricing = publicRoutes.pricing.routerLink;

  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly dataService = inject(DataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly userService = inject(UserService);

  public ngOnInit() {
    const { baseCurrency, subscriptionOffer } = this.dataService.fetchInfo();

    this.baseCurrency = baseCurrency;
    this.setPrice(subscriptionOffer);

    this.userService.stateChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (state?.user) {
          this.setPrice(
            state.user.subscription?.offer,
            state.user.subscription?.type
          );
        }

        this.changeDetectorRef.markForCheck();
      });
  }

  private setPrice(
    offer: SubscriptionOffer | undefined,
    subscriptionType?: SubscriptionType
  ) {
    this.price =
      offer?.durationExtension &&
      offer.price &&
      subscriptionType !== SubscriptionType.Premium
        ? offer.price - (offer.coupon ?? 0)
        : undefined;
  }
}
