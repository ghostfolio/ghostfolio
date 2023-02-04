import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';

import { FaqPageRoutingModule } from './faq-page-routing.module';
import { FaqPageComponent } from './faq-page.component';

@NgModule({
  declarations: [FaqPageComponent],
  imports: [CommonModule, FaqPageRoutingModule, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FaqPageModule {}
