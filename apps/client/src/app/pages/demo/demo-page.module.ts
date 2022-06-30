import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { DemoPageRoutingModule } from './demo-page-routing.module';
import { DemoPageComponent } from './demo-page.component';

@NgModule({
  declarations: [DemoPageComponent],
  imports: [CommonModule, DemoPageRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DemoPageModule {}
