import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';
import { SymbolAutocompleteComponent } from '@ghostfolio/ui/symbol-autocomplete/symbol-autocomplete.component';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@NgModule({
  declarations: [SymbolAutocompleteComponent],
  exports: [SymbolAutocompleteComponent],
  imports: [
    CommonModule,
    FormsModule,
    GfPremiumIndicatorModule,
    GfSymbolModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfSymbolAutocompleteModule {}
