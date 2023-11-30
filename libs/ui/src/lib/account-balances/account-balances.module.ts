import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { GfValueModule } from '@ghostfolio/ui/value';

import { AccountBalancesComponent } from './account-balances.component';

@NgModule({
  declarations: [AccountBalancesComponent],
  exports: [AccountBalancesComponent],
  imports: [CommonModule, GfValueModule, MatTableModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAccountBalancesModule {}
