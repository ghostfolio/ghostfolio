import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { AboutOverviewPageRoutingModule } from './about-overview-page-routing.module';
import { AboutOverviewPageComponent } from './about-overview-page.component';

@NgModule({
  declarations: [AboutOverviewPageComponent],
  imports: [
    AboutOverviewPageRoutingModule,
    CommonModule,
    MatButtonModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AboutOverviewPageModule {}
