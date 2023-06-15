import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { CreateAssetProfileDialog } from './create-asset-profile-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { GfSymbolAutocompleteModule } from '@ghostfolio/ui/symbol-autocomplete';

@NgModule({
  declarations: [CreateAssetProfileDialog],
  imports: [
    CommonModule,
    FormsModule,
    GfSymbolAutocompleteModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfCreateAssetProfileDialogModule {}
