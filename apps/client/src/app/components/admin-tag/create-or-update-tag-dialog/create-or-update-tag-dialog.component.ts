import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { CreateOrUpdateTagDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  selector: 'gf-create-or-update-tag-dialog',
  styleUrls: ['./create-or-update-tag-dialog.scss'],
  templateUrl: 'create-or-update-tag-dialog.html'
})
export class CreateOrUpdateTagDialog {
  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateTagDialogParams,
    public dialogRef: MatDialogRef<CreateOrUpdateTagDialog>
  ) {}

  public onCancel() {
    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
