import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { FaqOverviewPageRoutingModule } from './faq-overview-page-routing.module';
import { FaqOverviewPageComponent } from './faq-overview-page.component';

@NgModule({
  declarations: [FaqOverviewPageComponent],
  imports: [CommonModule, FaqOverviewPageRoutingModule, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FaqOverviewPageModule {}
