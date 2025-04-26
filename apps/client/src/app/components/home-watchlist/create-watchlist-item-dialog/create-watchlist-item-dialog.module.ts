import { GfSymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';

import { CreateWatchlistItemDialog } from './create-watchlist-item-dialog.component';

@NgModule({
  declarations: [CreateWatchlistItemDialog],
  imports: [
    CommonModule,
    FormsModule,
    GfSymbolAutocompleteComponent,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfCreateWatchlistItemDialogModule {}
