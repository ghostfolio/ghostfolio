import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { RouterModule } from '@angular/router';
import { GfPositionDetailDialogModule } from '@ghostfolio/client/components/position/position-detail-dialog/position-detail-dialog.module';
import { GfPositionsModule } from '@ghostfolio/client/components/positions/positions.module';
import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';

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
