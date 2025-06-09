import { routes } from '@ghostfolio/common/routes';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import ms from 'ms';
import { interval, Subject } from 'rxjs';
import { take, takeUntil, tap } from 'rxjs/operators';

import { SubscriptionInterstitialDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column flex-grow-1 h-100' },
  selector: 'gf-subscription-interstitial-dialog',
  styleUrls: ['./subscription-interstitial-dialog.scss'],
  templateUrl: 'subscription-interstitial-dialog.html',
  standalone: false
})
export class SubscriptionInterstitialDialog implements OnInit {
  private static readonly SKIP_BUTTON_DELAY_IN_SECONDS = 5;
  private static readonly VARIANTS_COUNT = 2;

  public remainingSkipButtonDelay =
    SubscriptionInterstitialDialog.SKIP_BUTTON_DELAY_IN_SECONDS;
  public routerLinkPricing = ['/' + routes.pricing];
  public variantIndex: number;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionInterstitialDialogParams,
    public dialogRef: MatDialogRef<SubscriptionInterstitialDialog>
  ) {
    this.variantIndex = Math.floor(
      Math.random() * SubscriptionInterstitialDialog.VARIANTS_COUNT
    );
  }

  public ngOnInit() {
    interval(ms('1 second'))
      .pipe(
        take(SubscriptionInterstitialDialog.SKIP_BUTTON_DELAY_IN_SECONDS),
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
