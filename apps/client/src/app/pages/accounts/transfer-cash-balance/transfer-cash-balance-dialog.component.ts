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
    public accounts: AccountModel[] = [];
    public currency = '';
    public transferCashBalanceForm: FormGroup;

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

        this.transferCashBalanceForm.get('fromAccount').valueChanges.subscribe((id) => {
            this.currency = this.accounts.find((account) => account.id === id).currency;
        })
    }

    public onCancel() {
        this.dialogRef.close();
    }

    public onSubmit() {
        const account: TransferCashBalanceDto = {
            balance: this.transferCashBalanceForm.controls['balance'].value,
            accountIdFrom: this.transferCashBalanceForm.controls['fromAccount'].value,
            accountIdTo: this.transferCashBalanceForm.controls['toAccount'].value,
        };

        console.log(`Transfer cash balance of ${account.balance} from account ${account.accountIdFrom} to account ${account.accountIdTo}`)

        this.dialogRef.close({ account });
    }

    public ngOnDestroy() {
        this.unsubscribeSubject.next();
        this.unsubscribeSubject.complete();
    }
}
