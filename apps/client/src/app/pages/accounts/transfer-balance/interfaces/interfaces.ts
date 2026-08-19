import { AccountWithPlatform } from '@ghostfolio/common/types';

import { FormControl, FormGroup } from '@angular/forms';

export interface TransferBalanceDialogParams {
  accounts: AccountWithPlatform[];
}

export type TransferBalanceForm = FormGroup<{
  balance: FormControl<number | string | null>;
  fromAccount: FormControl<string | null>;
  toAccount: FormControl<string | null>;
}>;
