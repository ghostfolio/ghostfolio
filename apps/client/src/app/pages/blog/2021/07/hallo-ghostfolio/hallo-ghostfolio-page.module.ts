import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { HalloGhostfolioPageRoutingModule } from './hallo-ghostfolio-page-routing.module';
import { HalloGhostfolioPageComponent } from './hallo-ghostfolio-page.component';

@NgModule({
  declarations: [HalloGhostfolioPageComponent],
  exports: [],
  imports: [CommonModule, HalloGhostfolioPageRoutingModule, RouterModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HalloGhostfolioPageModule {}
