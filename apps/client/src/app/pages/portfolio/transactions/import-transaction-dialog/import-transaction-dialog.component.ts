import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { ImportTransactionDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-import-transaction-dialog',
  styleUrls: ['./import-transaction-dialog.scss'],
  templateUrl: 'import-transaction-dialog.html'
})
export class ImportTransactionDialog implements OnDestroy {
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: ImportTransactionDialogParams,
    public dialogRef: MatDialogRef<ImportTransactionDialog>
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
