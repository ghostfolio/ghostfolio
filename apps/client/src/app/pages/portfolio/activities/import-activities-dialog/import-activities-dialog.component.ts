import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { ImportActivitiesDialogParams } from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'gf-import-activities-dialog',
  styleUrls: ['./import-activities-dialog.scss'],
  templateUrl: 'import-activities-dialog.html'
})
export class ImportActivitiesDialog implements OnDestroy {
  public details: any[] = [];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: ImportActivitiesDialogParams,
    public dialogRef: MatDialogRef<ImportActivitiesDialog>
  ) {}

  public ngOnInit() {
    for (const message of this.data.messages) {
      if (message.includes('activities.')) {
        let [index] = message.split(' ');
        index = index.replace('activities.', '');
        [index] = index.split('.');

        this.details.push(this.data.activities[index]);
      } else {
        this.details.push('');
      }
    }
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
