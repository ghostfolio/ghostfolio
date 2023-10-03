import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateAccountDto } from '@ghostfolio/api/app/account/create-account.dto';
import { UpdateAccountDto } from '@ghostfolio/api/app/account/update-account.dto';
import { DataService } from '@ghostfolio/client/services/data.service';
import { Subject } from 'rxjs';

import { CreateOrUpdateAccountDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'h-100' },
  selector: 'gf-create-or-update-account-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./create-or-update-account-dialog.scss'],
  templateUrl: 'create-or-update-account-dialog.html'
})
export class CreateOrUpdateAccountDialog implements OnDestroy {
  public accountForm: FormGroup;
  public currencies: string[] = [];
  public platforms: { id: string; name: string }[];

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreateOrUpdateAccountDialogParams,
    private dataService: DataService,
    public dialogRef: MatDialogRef<CreateOrUpdateAccountDialog>,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    const { currencies, platforms } = this.dataService.fetchInfo();

    this.currencies = currencies;
    this.platforms = platforms;

    this.accountForm = this.formBuilder.group({
      accountId: [{ disabled: true, value: this.data.account.id }],
      balance: [this.data.account.balance, Validators.required],
      comment: [this.data.account.comment],
      currency: [this.data.account.currency, Validators.required],
      isExcluded: [this.data.account.isExcluded],
      name: [this.data.account.name, Validators.required],
      platformId: [this.data.account.platformId]
    });
  }

  public onSubmit() {
    const account: CreateAccountDto | UpdateAccountDto = {
      balance: this.accountForm.controls['balance'].value,
      comment: this.accountForm.controls['comment'].value,
      currency: this.accountForm.controls['currency'].value,
      id: this.accountForm.controls['accountId'].value,
      isExcluded: this.accountForm.controls['isExcluded'].value,
      name: this.accountForm.controls['name'].value,
      platformId: this.accountForm.controls['platformId'].value
    };

    if (this.data.account.id) {
      (account as UpdateAccountDto).id = this.data.account.id;
    } else {
      delete (account as CreateAccountDto).id;
    }

    this.dialogRef.close({ account });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }
}
