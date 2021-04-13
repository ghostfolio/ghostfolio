import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { PositionDetailDialogModule } from '../position/position-detail-dialog/position-detail-dialog.module';
import { GfSymbolIconModule } from '../symbol-icon/symbol-icon.module';
import { GfValueModule } from '../value/value.module';
import { TransactionsTableComponent } from './transactions-table.component';

@NgModule({
  declarations: [TransactionsTableComponent],
  exports: [TransactionsTableComponent],
  imports: [
    CommonModule,
    GfSymbolIconModule,
    GfValueModule,
    MatButtonModule,
    MatInputModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    PositionDetailDialogModule,
    RouterModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfTransactionsTableModule {}
