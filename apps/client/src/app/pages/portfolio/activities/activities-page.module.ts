import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { ImportTransactionsService } from '@ghostfolio/client/services/import-transactions.service';
import { GfActivitiesTableModule } from '@ghostfolio/ui/activities-table/activities-table.module';

import { GfCreateOrUpdateActivityDialogModule } from './create-or-update-activity-dialog/create-or-update-activity-dialog.module';
import { GfImportTransactionDialogModule } from './import-transaction-dialog/import-transaction-dialog.module';
import { ActivitiesPageRoutingModule } from './activities-page-routing.module';
import { ActivitiesPageComponent } from './activities-page.component';

@NgModule({
  declarations: [ActivitiesPageComponent],
  imports: [
    ActivitiesPageRoutingModule,
    CommonModule,
    GfActivitiesTableModule,
    GfCreateOrUpdateActivityDialogModule,
    GfImportTransactionDialogModule,
    MatButtonModule,
    MatSnackBarModule,
    RouterModule
  ],
  providers: [ImportTransactionsService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ActivitiesPageModule {}
