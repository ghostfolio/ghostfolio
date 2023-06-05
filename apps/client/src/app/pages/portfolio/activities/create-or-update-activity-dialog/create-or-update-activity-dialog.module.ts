import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { GfSymbolAutoCompleteModule } from '@ghostfolio/ui/symbol-autocomplete/symbol-autocomplete.module';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { GfValueModule } from '@ghostfolio/ui/value';
import { CreateOrUpdateActivityDialog } from './create-or-update-activity-dialog.component';

@NgModule({
  declarations: [CreateOrUpdateActivityDialog],
  imports: [
    CommonModule,
    FormsModule,
    GfSymbolAutoCompleteModule,
    GfSymbolModule,
    GfValueModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfCreateOrUpdateActivityDialogModule {}
