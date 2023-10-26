import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { GfSymbolIconModule } from '@ghostfolio/client/components/symbol-icon/symbol-icon.module';
import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { GfActivitiesFilterModule } from '@ghostfolio/ui/activities-filter/activities-filter.module';
import { GfActivityTypeModule } from '@ghostfolio/ui/activity-type';
import { GfNoTransactionsInfoModule } from '@ghostfolio/ui/no-transactions-info';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AccountBalancesComponent } from './account-balances.component';

@NgModule({
  declarations: [AccountBalancesComponent],
  exports: [AccountBalancesComponent],
  imports: [
    CommonModule,
    GfActivitiesFilterModule,
    GfActivityTypeModule,
    GfNoTransactionsInfoModule,
    GfSymbolIconModule,
    GfSymbolModule,
    GfValueModule,
    MatButtonModule,
    MatCheckboxModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAccountBalancesModule {}
