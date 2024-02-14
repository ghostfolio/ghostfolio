import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { SelfHostingPageRoutingModule } from './self-hosting-page-routing.module';
import { SelfHostingPageComponent } from './self-hosting-page.component';

@NgModule({
  declarations: [SelfHostingPageComponent],
  imports: [CommonModule, MatCardModule, SelfHostingPageRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SelfHostingPageModule {}
