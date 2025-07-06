import { GfCurrencySelectorComponent } from '@ghostfolio/ui/currency-selector';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { CreateOrUpdateAccountDialog } from './create-or-update-account-dialog.component';

@NgModule({
  declarations: [CreateOrUpdateAccountDialog],
  imports: [
    CommonModule,
    FormsModule,
    GfCurrencySelectorComponent,
    GfEntityLogoComponent,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ]
})
export class GfCreateOrUpdateAccountDialogModule {}
