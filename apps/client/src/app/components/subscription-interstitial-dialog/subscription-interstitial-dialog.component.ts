import { publicRoutes } from '@ghostfolio/common/routes/routes';
import { GfMembershipCardComponent } from '@ghostfolio/ui/membership-card';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Inject,
  OnInit
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, checkmarkCircleOutline } from 'ionicons/icons';
import ms from 'ms';
import { interval, Subject } from 'rxjs';
import { take, takeUntil, tap } from 'rxjs/operators';

import { SubscriptionInterstitialDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column flex-grow-1 h-100' },
  imports: [
    CommonModule,
    GfMembershipCardComponent,
    GfPremiumIndicatorComponent,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: 'gf-subscription-interstitial-dialog',
  styleUrls: ['./subscription-interstitial-dialog.scss'],
  templateUrl: 'subscription-interstitial-dialog.html'
})
export class GfSubscriptionInterstitialDialogComponent implements OnInit {
  private static readonly SKIP_BUTTON_DELAY_IN_SECONDS = 5;
  private static readonly VARIANTS_COUNT = 4;

  public remainingSkipButtonDelay =
    GfSubscriptionInterstitialDialogComponent.SKIP_BUTTON_DELAY_IN_SECONDS;
  public routerLinkPricing = publicRoutes.pricing.routerLink;
  public variantIndex: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionInterstitialDialogParams,
    public dialogRef: MatDialogRef<GfSubscriptionInterstitialDialogComponent>
  ) {
    this.variantIndex = Math.floor(
      Math.random() * GfSubscriptionInterstitialDialogComponent.VARIANTS_COUNT
    );

    addIcons({ arrowForwardOutline, checkmarkCircleOutline });
  }

  public ngOnInit() {
    interval(ms('1 second'))
      .pipe(
        take(
          GfSubscriptionInterstitialDialogComponent.SKIP_BUTTON_DELAY_IN_SECONDS
        ),
        tap(() => {
          this.remainingSkipButtonDelay--;

          this.changeDetectorRef.markForCheck();
        }),
        takeUntil(this.unsubscribeSubject)
      )
      .subscribe();
  }

  public closeDialog() {
    this.dialogRef.close({});
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
