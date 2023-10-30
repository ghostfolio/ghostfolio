import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GfActivityTypeModule } from '@ghostfolio/ui/activity-type/activity-type.module';
import { GfSymbolIconModule } from '@ghostfolio/client/components/symbol-icon/symbol-icon.module';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';

import { ActivitiesFilterComponent } from './activities-filter.component';

@NgModule({
  declarations: [ActivitiesFilterComponent],
  exports: [ActivitiesFilterComponent],
  imports: [
    CommonModule,
    GfActivityTypeModule,
    GfSymbolIconModule,
    GfSymbolModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfActivitiesFilterModule {}
