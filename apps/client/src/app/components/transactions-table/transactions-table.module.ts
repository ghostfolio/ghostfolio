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
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { GfPositionDetailDialogModule } from '../position/position-detail-dialog/position-detail-dialog.module';
import { GfSymbolIconModule } from '../symbol-icon/symbol-icon.module';
import { GfValueModule } from '../value/value.module';
import { TransactionsTableComponent } from './transactions-table.component';

@NgModule({
  declarations: [TransactionsTableComponent],
  exports: [TransactionsTableComponent],
  imports: [
    CommonModule,
    GfPositionDetailDialogModule,
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
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfTransactionsTableModule {}
