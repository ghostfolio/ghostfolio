import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { AlternativesPageRoutingModule } from './alternatives-page-routing.module';
import { AlternativesPageComponent } from './alternatives-page.component';

@NgModule({
  declarations: [AlternativesPageComponent],
  imports: [AlternativesPageRoutingModule, CommonModule, MatCardModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AlternativesPageModule {}
