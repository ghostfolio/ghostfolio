import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';

import { ResourcesPageRoutingModule } from './resources-page-routing.module';
import { ResourcesPageComponent } from './resources-page.component';

@NgModule({
  declarations: [ResourcesPageComponent],
  imports: [CommonModule, MatCardModule, ResourcesPageRoutingModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ResourcesPageModule {}
