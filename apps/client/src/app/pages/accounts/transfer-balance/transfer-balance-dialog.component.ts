import { TransferBalanceDto } from '@ghostfolio/common/dtos';
import { AccountWithPlatform } from '@ghostfolio/common/types';
import { GfAccountSelectorComponent } from '@ghostfolio/ui/account-selector';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
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

import {
  TransferBalanceDialogParams,
  TransferBalanceForm
} from './interfaces/interfaces';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'h-100' },
  imports: [
    GfAccountSelectorComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  selector: 'gf-transfer-balance-dialog',
  styleUrls: ['./transfer-balance-dialog.scss'],
  templateUrl: 'transfer-balance-dialog.html'
})
export class GfTransferBalanceDialogComponent {
  protected readonly accounts: AccountWithPlatform[] =
    inject<TransferBalanceDialogParams>(MAT_DIALOG_DATA).accounts;

  protected currency: string;

  protected readonly labelFrom = $localize`From`;
  protected readonly labelTo = $localize`To`;

  protected readonly toAccounts = computed(() => {
    const fromAccountId = this.fromAccountId();

    return this.accounts.filter(({ id }) => {
      return id !== fromAccountId;
    });
  });

  protected readonly transferBalanceForm: TransferBalanceForm = new FormGroup({
    balance: new FormControl<number | string | null>('', Validators.required),
    fromAccount: new FormControl<string | null>(null, Validators.required),
    toAccount: new FormControl<string | null>(null, Validators.required)
  });

  private readonly dialogRef =
    inject<MatDialogRef<GfTransferBalanceDialogComponent>>(MatDialogRef);

  private readonly fromAccountId = signal<string | null>(null);

  public ngOnInit() {
    this.transferBalanceForm.controls.fromAccount.valueChanges.subscribe(
      (id) => {
        this.fromAccountId.set(id);

        const currency = this.getAccountById(id)?.currency;

        if (currency) {
          this.currency = currency;
        }

        const toAccountControl = this.transferBalanceForm.controls.toAccount;

        if (id && toAccountControl.value === id) {
          toAccountControl.setValue(null);
          toAccountControl.markAsPristine();
          toAccountControl.markAsUntouched();
        }
      }
    );
  }

  protected onCancel() {
    this.dialogRef.close();
  }

  protected onSubmit() {
    const transferBalance: TransferBalanceDto = {
      accountIdFrom: this.transferBalanceForm.controls.fromAccount.value ?? '',
      accountIdTo: this.transferBalanceForm.controls.toAccount.value ?? '',
      balance: Number(this.transferBalanceForm.controls.balance.value)
    };

    this.dialogRef.close(transferBalance);
  }

  private getAccountById(aId: string | null) {
    return this.accounts.find(({ id }) => {
      return id === aId;
    });
  }
}
