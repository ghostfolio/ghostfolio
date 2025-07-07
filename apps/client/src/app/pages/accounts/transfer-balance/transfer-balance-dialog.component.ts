import { TransferBalanceDto } from '@ghostfolio/api/app/account/transfer-balance.dto';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';

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
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Account } from '@prisma/client';
import { Subject } from 'rxjs';

import { TransferBalanceDialogParams } from './interfaces/interfaces';

@Component({
  host: { class: 'h-100' },
  imports: [
    GfEntityLogoComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
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
      accountIdFrom: this.transferBalanceForm.get('fromAccount').value,
      accountIdTo: this.transferBalanceForm.get('toAccount').value,
      balance: this.transferBalanceForm.get('balance').value
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
