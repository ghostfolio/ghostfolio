import { TransferBalanceDto } from '@ghostfolio/api/app/account/transfer-balance.dto';

import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Account } from '@prisma/client';
import { Subject } from 'rxjs';

import { TransferBalanceDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'h-100' },
  selector: 'gf-transfer-balance-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./transfer-balance-dialog.scss'],
  templateUrl: 'transfer-balance-dialog.html'
})
export class TransferBalanceDialog implements OnDestroy {
  public accounts: Account[] = [];
  public currency: string;
  public transferBalanceForm: FormGroup;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    @Inject(MAT_DIALOG_DATA) public data: TransferBalanceDialogParams,
    public dialogRef: MatDialogRef<TransferBalanceDialog>,
    private formBuilder: FormBuilder
  ) {}

  public ngOnInit() {
    this.accounts = this.data.accounts;

    this.transferBalanceForm = this.formBuilder.group(
      {
        balance: ['', Validators.required],
        fromAccount: ['', Validators.required],
        toAccount: ['', Validators.required]
      },
      {
        validators: this.compareAccounts
      }
    );

    this.transferBalanceForm.get('fromAccount').valueChanges.subscribe((id) => {
      this.currency = this.accounts.find((account) => {
        return account.id === id;
      }).currency;
    });
  }

  public onCancel() {
    this.dialogRef.close();
  }

  public onSubmit() {
    const account: TransferBalanceDto = {
      accountIdFrom: this.transferBalanceForm.controls['fromAccount'].value,
      accountIdTo: this.transferBalanceForm.controls['toAccount'].value,
      balance: this.transferBalanceForm.controls['balance'].value
    };

    this.dialogRef.close({ account });
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private compareAccounts(control: AbstractControl): ValidationErrors {
    const accountFrom = control.get('fromAccount');
    const accountTo = control.get('toAccount');

    if (accountFrom.value === accountTo.value) {
      return { invalid: true };
    }
  }
}
