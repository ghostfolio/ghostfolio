import { GfToggleModule } from '@ghostfolio/client/components/toggle/toggle.module';
import { GfHoldingsTableComponent } from '@ghostfolio/ui/holdings-table';
import { GfTreemapChartComponent } from '@ghostfolio/ui/treemap-chart';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { HomeHoldingsComponent } from './home-holdings.component';

@NgModule({
  declarations: [HomeHoldingsComponent],
  imports: [
    CommonModule,
    GfHoldingsTableComponent,
    GfToggleModule,
    GfTreemapChartComponent,
    MatButtonModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfHomeHoldingsModule {}
