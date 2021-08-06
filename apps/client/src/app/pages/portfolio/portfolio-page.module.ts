import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

import { PortfolioPageRoutingModule } from './portfolio-page-routing.module';
import { PortfolioPageComponent } from './portfolio-page.component';

@NgModule({
  declarations: [PortfolioPageComponent],
  exports: [],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    PortfolioPageRoutingModule,
    RouterModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PortfolioPageModule {}
