import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';

import { AboutPageRoutingModule } from './about-page-routing.module';
import { AboutPageComponent } from './about-page.component';

@NgModule({
  declarations: [AboutPageComponent],
  imports: [AboutPageRoutingModule, CommonModule, MatTabsModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AboutPageModule {}
