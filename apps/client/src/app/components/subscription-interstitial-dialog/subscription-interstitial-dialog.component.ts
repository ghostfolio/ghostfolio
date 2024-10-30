import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { SubscriptionInterstitialDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column flex-grow-1 h-100' },
  selector: 'gf-subscription-interstitial-dialog',
  styleUrls: ['./subscription-interstitial-dialog.scss'],
  templateUrl: 'subscription-interstitial-dialog.html'
})
export class SubscriptionInterstitialDialog {
  private readonly VARIANTS_COUNT = 2;

  public routerLinkPricing = ['/' + $localize`:snake-case:pricing`];
  public variantIndex: number;

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionInterstitialDialogParams,
    public dialogRef: MatDialogRef<SubscriptionInterstitialDialog>
  ) {
    this.variantIndex = Math.floor(Math.random() * this.VARIANTS_COUNT);
  }

  public closeDialog() {
    this.dialogRef.close({});
  }
}
