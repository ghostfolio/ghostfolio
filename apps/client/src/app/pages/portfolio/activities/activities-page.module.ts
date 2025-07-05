import { ImportActivitiesService } from '@ghostfolio/client/services/import-activities.service';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

import { ActivitiesPageRoutingModule } from './activities-page-routing.module';
import { ActivitiesPageComponent } from './activities-page.component';
import { GfCreateOrUpdateActivityDialogModule } from './create-or-update-activity-dialog/create-or-update-activity-dialog.module';
import { GfImportActivitiesDialogModule } from './import-activities-dialog/import-activities-dialog.module';

@NgModule({
  declarations: [ActivitiesPageComponent],
  imports: [
    ActivitiesPageRoutingModule,
    CommonModule,
    GfActivitiesTableComponent,
    GfCreateOrUpdateActivityDialogModule,
    GfImportActivitiesDialogModule,
    IonIcon,
    MatButtonModule,
    MatSnackBarModule,
    RouterModule
  ],
  providers: [ImportActivitiesService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ActivitiesPageModule {}
