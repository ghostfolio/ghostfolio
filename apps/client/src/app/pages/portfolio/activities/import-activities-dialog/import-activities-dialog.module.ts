import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { GfActivitiesTableModule } from '@ghostfolio/ui/activities-table/activities-table.module';
import { GfDialogFooterModule } from '@ghostfolio/client/components/dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '@ghostfolio/client/components/dialog-header/dialog-header.module';

import { ImportActivitiesDialog } from './import-activities-dialog.component';

@NgModule({
  declarations: [ImportActivitiesDialog],
  imports: [
    CommonModule,
    GfActivitiesTableModule,
    GfDialogFooterModule,
    GfDialogHeaderModule,
    MatButtonModule,
    MatDialogModule,
    MatExpansionModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfImportActivitiesDialogModule {}
