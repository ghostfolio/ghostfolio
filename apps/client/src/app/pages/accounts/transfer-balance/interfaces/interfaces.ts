import { FormControl, FormGroup } from '@angular/forms';
import { Account } from '@prisma/client';

export interface TransferBalanceDialogParams {
  accounts: Account[];
}

export type TransferBalanceForm = FormGroup<{
  balance: FormControl<number | string | null>;
  fromAccount: FormControl<string | null>;
  toAccount: FormControl<string | null>;
}>;
