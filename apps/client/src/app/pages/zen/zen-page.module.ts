import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { RouterModule } from '@angular/router';
import { GfHomeHoldingsModule } from '@ghostfolio/client/components/home-holdings/home-holdings.module';
import { GfHomeOverviewModule } from '@ghostfolio/client/components/home-overview/home-overview.module';

import { ZenPageRoutingModule } from './zen-page-routing.module';
import { ZenPageComponent } from './zen-page.component';

@NgModule({
  declarations: [ZenPageComponent],
  imports: [
    CommonModule,
    GfHomeHoldingsModule,
    GfHomeOverviewModule,
    MatTabsModule,
    RouterModule,
    ZenPageRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ZenPageModule {}
