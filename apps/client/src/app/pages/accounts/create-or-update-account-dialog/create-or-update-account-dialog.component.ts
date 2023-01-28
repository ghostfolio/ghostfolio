import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
export class CreateOrUpdateAccountDialog implements OnDestroy {
  public currencies: string[] = [];
  public platforms: { id: string; name: string }[];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private dataService: DataService,
    public dialogRef: MatDialogRef<CreateOrUpdateAccountDialog>,
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateAccountDialogParams
  ) {}

  ngOnInit() {
    const { currencies, platforms } = this.dataService.fetchInfo();

    this.currencies = currencies;
    this.platforms = platforms;
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
