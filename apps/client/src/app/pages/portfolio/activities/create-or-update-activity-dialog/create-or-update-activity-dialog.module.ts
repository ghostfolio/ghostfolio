import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { GfSymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete';
import { GfTagsSelectorComponent } from '@ghostfolio/ui/tags-selector';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { IonIcon } from '@ionic/angular/standalone';

import { CreateOrUpdateActivityDialog } from './create-or-update-activity-dialog.component';

@NgModule({
  declarations: [CreateOrUpdateActivityDialog],
  imports: [
    CommonModule,
    FormsModule,
    GfEntityLogoComponent,
    GfSymbolAutocompleteComponent,
    GfTagsSelectorComponent,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfCreateOrUpdateActivityDialogModule {}
