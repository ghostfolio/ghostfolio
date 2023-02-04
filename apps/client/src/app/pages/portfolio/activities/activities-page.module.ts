import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { RouterModule } from '@angular/router';
import { ImportActivitiesService } from '@ghostfolio/client/services/import-activities.service';
import { GfActivitiesTableModule } from '@ghostfolio/ui/activities-table/activities-table.module';

import { ActivitiesPageRoutingModule } from './activities-page-routing.module';
import { ActivitiesPageComponent } from './activities-page.component';
import { GfCreateOrUpdateActivityDialogModule } from './create-or-update-activity-dialog/create-or-update-activity-dialog.module';
import { GfImportActivitiesDialogModule } from './import-activities-dialog/import-activities-dialog.module';

@NgModule({
  declarations: [ActivitiesPageComponent],
  imports: [
    ActivitiesPageRoutingModule,
    CommonModule,
    GfActivitiesTableModule,
    GfCreateOrUpdateActivityDialogModule,
    GfImportActivitiesDialogModule,
    MatButtonModule,
    MatSnackBarModule,
    RouterModule
  ],
  providers: [ImportActivitiesService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ActivitiesPageModule {}
