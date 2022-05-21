import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { FirstMonthsInOpenSourceRoutingModule } from './first-months-in-open-source-page-routing.module';
import { FirstMonthsInOpenSourcePageComponent } from './first-months-in-open-source-page.component';

@NgModule({
  declarations: [FirstMonthsInOpenSourcePageComponent],
  imports: [CommonModule, FirstMonthsInOpenSourceRoutingModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FirstMonthsInOpenSourcePageModule {}
