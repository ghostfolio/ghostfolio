import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { GfSymbolIconModule } from '@ghostfolio/client/components/symbol-icon/symbol-icon.module';

import { CreateOrUpdateAccountDialog } from './create-or-update-account-dialog.component';

@NgModule({
  declarations: [CreateOrUpdateAccountDialog],
  imports: [
    CommonModule,
    FormsModule,
    GfSymbolIconModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ]
})
export class GfCreateOrUpdateAccountDialogModule {}
