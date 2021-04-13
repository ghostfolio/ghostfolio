import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { ResourcesPageRoutingModule } from './resources-page-routing.module';
import { ResourcesPageComponent } from './resources-page.component';

@NgModule({
  declarations: [ResourcesPageComponent],
  exports: [],
  imports: [CommonModule, MatCardModule, ResourcesPageRoutingModule],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ResourcesPageModule {}
