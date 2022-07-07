import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { GfDialogFooterModule } from '@ghostfolio/client/components/dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '@ghostfolio/client/components/dialog-header/dialog-header.module';

import { ImportTransactionDialog } from './import-transaction-dialog.component';

@NgModule({
  declarations: [ImportTransactionDialog],
  imports: [
    CommonModule,
    GfDialogFooterModule,
    GfDialogHeaderModule,
    MatButtonModule,
    MatDialogModule,
    MatExpansionModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfImportTransactionDialogModule {}
