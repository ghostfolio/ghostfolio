import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { GfSymbolAutocompleteModule } from '@ghostfolio/ui/symbol-autocomplete';

import { CreateAssetProfileDialog } from './create-asset-profile-dialog.component';

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
