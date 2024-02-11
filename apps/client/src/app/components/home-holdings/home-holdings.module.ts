import { GfPositionDetailDialogModule } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.module';
import { GfPositionsModule } from '@ghostfolio/client/components/positions/positions.module';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

import { HomeHoldingsComponent } from './home-holdings.component';

@NgModule({
  declarations: [HomeHoldingsComponent],
  imports: [
    CommonModule,
    GfPositionDetailDialogModule,
    GfPositionsModule,
    GfToggleModule,
    MatButtonModule,
    MatCardModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHomeHoldingsModule {}
