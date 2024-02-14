import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';

import { FaqPageRoutingModule } from './faq-page-routing.module';
import { FaqPageComponent } from './faq-page.component';

@NgModule({
  declarations: [FaqPageComponent],
  imports: [CommonModule, FaqPageRoutingModule, MatTabsModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FaqPageModule {}
