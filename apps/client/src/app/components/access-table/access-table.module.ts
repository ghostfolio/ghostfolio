import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material/table';

import { AccessTableComponent } from './access-table.component';

@NgModule({
  declarations: [AccessTableComponent],
  exports: [AccessTableComponent],
  imports: [CommonModule, MatTableModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPortfolioAccessTableModule {}
