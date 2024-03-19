import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { SaasPageRoutingModule } from './saas-page-routing.module';
import { SaasPageComponent } from './saas-page.component';

@NgModule({
  declarations: [SaasPageComponent],
  imports: [CommonModule, MatCardModule, SaasPageRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SaasPageModule {}
