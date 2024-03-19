import { GfValueModule } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { OpenPageRoutingModule } from './open-page-routing.module';
import { OpenPageComponent } from './open-page.component';

@NgModule({
  declarations: [OpenPageComponent],
  imports: [CommonModule, GfValueModule, MatCardModule, OpenPageRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OpenPageModule {}
