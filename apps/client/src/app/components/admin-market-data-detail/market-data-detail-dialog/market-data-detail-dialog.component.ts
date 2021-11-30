import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { MarketDataDetailDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'h-100' },
  selector: 'gf-market-data-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./market-data-detail-dialog.scss'],
  templateUrl: 'market-data-detail-dialog.html'
})
export class MarketDataDetailDialog implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    public dialogRef: MatDialogRef<MarketDataDetailDialog>,
    @Inject(MAT_DIALOG_DATA) public data: MarketDataDetailDialogParams
  ) {}

  public ngOnInit() {}

  public onCancel(): void {
    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
