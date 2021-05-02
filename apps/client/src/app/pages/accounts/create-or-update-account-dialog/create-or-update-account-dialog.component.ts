import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Currency } from '@prisma/client';
import { Subject } from 'rxjs';

import { DataService } from '../../../services/data.service';
import { CreateOrUpdateAccountDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'h-100' },
  selector: 'gf-create-or-update-account-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./create-or-update-account-dialog.scss'],
  templateUrl: 'create-or-update-account-dialog.html'
})
export class CreateOrUpdateAccountDialog {
  public currencies: Currency[] = [];
  public platforms: { id: string; name: string }[];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    public dialogRef: MatDialogRef<CreateOrUpdateAccountDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateAccountDialogParams
  ) {}

  ngOnInit() {
    this.dataService.fetchInfo().subscribe(({ currencies, platforms }) => {
      this.currencies = currencies;
      this.platforms = platforms;
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
