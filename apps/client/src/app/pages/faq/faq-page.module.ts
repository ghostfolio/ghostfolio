import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { FaqPageRoutingModule } from './faq-page-routing.module';
import { FaqPageComponent } from './faq-page.component';

@NgModule({
  declarations: [FaqPageComponent],
  imports: [CommonModule, FaqPageRoutingModule, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FaqPageModule {}
