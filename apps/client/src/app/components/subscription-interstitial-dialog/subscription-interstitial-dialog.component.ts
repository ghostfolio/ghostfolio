import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import {
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
  MatLegacyDialogRef as MatDialogRef
} from '@angular/material/legacy-dialog';

import { SubscriptionInterstitialDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'd-flex flex-column flex-grow-1 h-100' },
  selector: 'gf-subscription-interstitial-dialog',
  styleUrls: ['./subscription-interstitial-dialog.scss'],
  templateUrl: 'subscription-interstitial-dialog.html'
})
export class SubscriptionInterstitialDialog {
  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionInterstitialDialogParams,
    public dialogRef: MatDialogRef<SubscriptionInterstitialDialog>
  ) {}

  public onCancel() {
    this.dialogRef.close({});
  }
}
