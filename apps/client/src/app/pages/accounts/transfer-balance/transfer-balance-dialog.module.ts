import { GfSymbolIconModule } from '@ghostfolio/client/components/symbol-icon/symbol-icon.module';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { TransferBalanceDialog } from './transfer-balance-dialog.component';

@NgModule({
  declarations: [TransferBalanceDialog],
  imports: [
    CommonModule,
    GfSymbolIconModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ]
})
export class GfTransferBalanceDialogModule {}
