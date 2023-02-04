import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatSortModule } from '@angular/material/sort';
import { RouterModule } from '@angular/router';
import { GfSymbolIconModule } from '@ghostfolio/client/components/symbol-icon/symbol-icon.module';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AccountsTableComponent } from './accounts-table.component';

@NgModule({
  declarations: [AccountsTableComponent],
  exports: [AccountsTableComponent],
  imports: [
    CommonModule,
    GfSymbolIconModule,
    GfValueModule,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAccountsTableModule {}
