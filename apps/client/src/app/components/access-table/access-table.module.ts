import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';

import { AccessTableComponent } from './access-table.component';

@NgModule({
  declarations: [AccessTableComponent],
  exports: [AccessTableComponent],
  imports: [CommonModule, MatButtonModule, MatMenuModule, MatTableModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPortfolioAccessTableModule {}
