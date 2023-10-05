import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TransferCashBalanceDto } from '@ghostfolio/api/app/account/transfer-cash-balance.dto';
import { Subject } from 'rxjs';
import { Account as AccountModel } from '@prisma/client';
import { TransferCashBalanceDialogParams } from './interfaces/interfaces';

@Component({
    host: { class: 'h-100' },
    selector: 'gf-transfer-cash-balance-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./transfer-cash-balance-dialog.scss'],
    templateUrl: 'transfer-cash-balance-dialog.html'
})
export class TransferCashBalanceDialog implements OnDestroy {
    public transferCashBalanceForm: FormGroup;
    public accounts: AccountModel[] = [];

    private unsubscribeSubject = new Subject<void>();

    public constructor(
        @Inject(MAT_DIALOG_DATA) public data: TransferCashBalanceDialogParams,
        public dialogRef: MatDialogRef<TransferCashBalanceDialog>,
        private formBuilder: FormBuilder
    ) { }

    ngOnInit() {

        this.accounts = this.data.accounts;

        this.transferCashBalanceForm = this.formBuilder.group({
            balance: [0, Validators.required],
            fromAccount: ['', Validators.required],
            toAccount: ['', Validators.required],
        });
    }

    public onCancel() {
        this.dialogRef.close();
    }

    public onSubmit() {
        const account: TransferCashBalanceDto = {
            balance: this.transferCashBalanceForm.controls['balance'].value,
            fromAccount: this.transferCashBalanceForm.controls['fromAccount'].value,
            toAccount: this.transferCashBalanceForm.controls['toAccount'].value,
        };

        console.log(`Transfer cash balance of ${account.balance} from account ${account.fromAccount} to account ${account.toAccount}`)

        this.dialogRef.close({ account });
    }

    public ngOnDestroy() {
        this.unsubscribeSubject.next();
        this.unsubscribeSubject.complete();
    }
}
