import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { GfPositionsTableModule } from '@ghostfolio/client/components/positions-table/positions-table.module';
import { GfActivitiesFilterModule } from '@ghostfolio/ui/activities-filter/activities-filter.module';

import { HoldingsPageRoutingModule } from './holdings-page-routing.module';
import { HoldingsPageComponent } from './holdings-page.component';

@NgModule({
  declarations: [HoldingsPageComponent],
  imports: [
    CommonModule,
    GfActivitiesFilterModule,
    GfPositionsTableModule,
    HoldingsPageRoutingModule,
    MatButtonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HoldingsPageModule {}
