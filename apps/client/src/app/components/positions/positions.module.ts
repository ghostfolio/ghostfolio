import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { GfNoTransactionsInfoModule } from '../no-transactions-info/no-transactions-info.module';
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
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfPositionsModule {}
