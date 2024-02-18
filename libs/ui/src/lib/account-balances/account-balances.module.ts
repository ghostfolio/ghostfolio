import { GfValueModule } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { AccountBalancesComponent } from './account-balances.component';

@NgModule({
  declarations: [AccountBalancesComponent],
  exports: [AccountBalancesComponent],
  imports: [
    CommonModule,
    GfValueModule,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAccountBalancesModule {}
