import { TransferBalanceDto } from '@ghostfolio/common/dtos';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { GfLocalizedNumberDirective } from '@ghostfolio/ui/localized-number';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  TransferBalanceDialogParams,
  TransferBalanceForm
} from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    GfEntityLogoComponent,
    GfLocalizedNumberDirective,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  selector: 'gf-transfer-balance-dialog',
  styleUrls: ['./transfer-balance-dialog.scss'],
  templateUrl: 'transfer-balance-dialog.html'
})
export class GfTransferBalanceDialogComponent {
  private readonly data = inject<TransferBalanceDialogParams>(MAT_DIALOG_DATA);

  protected readonly accounts = this.data.accounts;

  protected currency: string;
  protected locale = this.data.locale ?? inject<string>(MAT_DATE_LOCALE);

  protected readonly transferBalanceForm: TransferBalanceForm = new FormGroup(
    {
      balance: new FormControl<number | string | null>('', Validators.required),
      fromAccount: new FormControl<string | null>('', Validators.required),
      toAccount: new FormControl<string | null>('', Validators.required)
    },
    {
      validators: this.compareAccounts
    }
  );

  private readonly dialogRef =
    inject<MatDialogRef<GfTransferBalanceDialogComponent>>(MatDialogRef);

  public ngOnInit() {
    this.transferBalanceForm.controls.fromAccount.valueChanges.subscribe(
      (id) => {
        const currency = this.accounts.find((account) => {
          return account.id === id;
        })?.currency;

        if (currency) {
          this.currency = currency;
        }
      }
    );
  }

  protected onCancel() {
    this.dialogRef.close();
  }

  protected onSubmit() {
    const account: TransferBalanceDto = {
      accountIdFrom: this.transferBalanceForm.controls.fromAccount.value ?? '',
      accountIdTo: this.transferBalanceForm.controls.toAccount.value ?? '',
      balance: Number(this.transferBalanceForm.controls.balance.value)
    };

    this.dialogRef.close({ account });
  }

  private compareAccounts(
    formGroup: TransferBalanceForm
  ): ValidationErrors | null {
    const accountFrom = formGroup.controls.fromAccount;
    const accountTo = formGroup.controls.toAccount;

    if (accountFrom.value === accountTo.value) {
      return { invalid: true };
    }

    return null;
  }
}
