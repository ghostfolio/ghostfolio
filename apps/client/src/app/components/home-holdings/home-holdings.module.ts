import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';
import { GfPositionDetailDialogModule } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.module';
import { GfPositionsModule } from '@ghostfolio/client/components/positions/positions.module';

import { HomeHoldingsComponent } from './home-holdings.component';

@NgModule({
  declarations: [HomeHoldingsComponent],
  exports: [],
  imports: [
    CommonModule,
    GfPositionDetailDialogModule,
    GfPositionsModule,
    MatButtonModule,
    MatCardModule,
    RouterModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHomeHoldingsModule {}
