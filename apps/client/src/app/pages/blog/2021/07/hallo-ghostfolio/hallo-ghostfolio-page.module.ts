import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { HalloGhostfolioPageRoutingModule } from './hallo-ghostfolio-page-routing.module';
import { HalloGhostfolioPageComponent } from './hallo-ghostfolio-page.component';

@NgModule({
  declarations: [HalloGhostfolioPageComponent],
  exports: [],
  imports: [CommonModule, HalloGhostfolioPageRoutingModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HalloGhostfolioPageModule {}
