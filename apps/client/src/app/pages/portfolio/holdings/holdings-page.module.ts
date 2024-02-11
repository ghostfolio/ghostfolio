import { GfHoldingsTableModule } from '@ghostfolio/ui/holdings-table/holdings-table.module';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { HoldingsPageRoutingModule } from './holdings-page-routing.module';
import { HoldingsPageComponent } from './holdings-page.component';

@NgModule({
  declarations: [HoldingsPageComponent],
  imports: [
    CommonModule,
    GfHoldingsTableModule,
    HoldingsPageRoutingModule,
    MatButtonModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HoldingsPageModule {}
