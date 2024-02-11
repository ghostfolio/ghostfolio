import { GfNoTransactionsInfoModule } from '@ghostfolio/ui/no-transactions-info';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { GfPositionModule } from '../position/position.module';
import { PositionsComponent } from './positions.component';

@NgModule({
  declarations: [PositionsComponent],
  exports: [PositionsComponent],
  imports: [
    CommonModule,
    GfNoTransactionsInfoModule,
    GfPositionModule,
    MatButtonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPositionsModule {}
