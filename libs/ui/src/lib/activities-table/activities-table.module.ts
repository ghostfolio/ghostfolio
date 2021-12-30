import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { GfSymbolIconModule } from '@ghostfolio/client/components/symbol-icon/symbol-icon.module';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { GfNoTransactionsInfoModule } from '@ghostfolio/ui/no-transactions-info';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { ActivitiesTableComponent } from './activities-table.component';

@NgModule({
  declarations: [ActivitiesTableComponent],
  exports: [ActivitiesTableComponent],
  imports: [
    CommonModule,
    GfNoTransactionsInfoModule,
    GfSymbolIconModule,
    GfSymbolModule,
    GfValueModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatInputModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    ReactiveFormsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfActivitiesTableModule {}
