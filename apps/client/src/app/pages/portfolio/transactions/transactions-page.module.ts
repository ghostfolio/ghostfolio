import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { ImportTransactionsService } from '@ghostfolio/client/services/import-transactions.service';
import { GfActivitiesTableModule } from '@ghostfolio/ui/activities-table/activities-table.module';

import { GfCreateOrUpdateTransactionDialogModule } from './create-or-update-transaction-dialog/create-or-update-transaction-dialog.module';
import { GfImportTransactionDialogModule } from './import-transaction-dialog/import-transaction-dialog.module';
import { TransactionsPageRoutingModule } from './transactions-page-routing.module';
import { TransactionsPageComponent } from './transactions-page.component';

@NgModule({
  declarations: [TransactionsPageComponent],
  exports: [],
  imports: [
    CommonModule,
    GfActivitiesTableModule,
    GfCreateOrUpdateTransactionDialogModule,
    GfImportTransactionDialogModule,
    MatButtonModule,
    MatSnackBarModule,
    RouterModule,
    TransactionsPageRoutingModule
  ],
  providers: [ImportTransactionsService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TransactionsPageModule {}
