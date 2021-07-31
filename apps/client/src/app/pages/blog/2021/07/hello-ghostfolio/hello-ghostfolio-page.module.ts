import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { HelloGhostfolioPageRoutingModule } from './hello-ghostfolio-page-routing.module';
import { HelloGhostfolioPageComponent } from './hello-ghostfolio-page.component';

@NgModule({
  declarations: [HelloGhostfolioPageComponent],
  exports: [],
  imports: [CommonModule, HelloGhostfolioPageRoutingModule, RouterModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HelloGhostfolioPageModule {}
