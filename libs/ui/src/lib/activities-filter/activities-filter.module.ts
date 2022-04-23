import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';

import { ActivitiesFilterComponent } from './activities-filter.component';

@NgModule({
  declarations: [ActivitiesFilterComponent],
  exports: [ActivitiesFilterComponent],
  imports: [
    CommonModule,
    GfSymbolModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfActivitiesFilterModule {}
