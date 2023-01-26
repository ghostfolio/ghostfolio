import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { SubscriptionInterstitialDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'd-flex flex-column flex-grow-1 h-100' },
  selector: 'gf-subscription-interstitial-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./subscription-interstitial-dialog.scss'],
  templateUrl: 'subscription-interstitial-dialog.html'
})
export class SubscriptionInterstitialDialog implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionInterstitialDialogParams,
    public dialogRef: MatDialogRef<SubscriptionInterstitialDialog>
  ) {}

  public ngOnInit() {}

  public onCancel() {
    this.dialogRef.close({});
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
