import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { GfTransactionsTableModule } from '@ghostfolio/client/components/transactions-table/transactions-table.module';

import { CreateOrUpdateTransactionDialogModule } from './create-or-update-transaction-dialog/create-or-update-transaction-dialog.module';
import { TransactionsPageRoutingModule } from './transactions-page-routing.module';
import { TransactionsPageComponent } from './transactions-page.component';

@NgModule({
  declarations: [TransactionsPageComponent],
  exports: [],
  imports: [
    CommonModule,
    CreateOrUpdateTransactionDialogModule,
    GfTransactionsTableModule,
    MatButtonModule,
    RouterModule,
    TransactionsPageRoutingModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TransactionsPageModule {}
