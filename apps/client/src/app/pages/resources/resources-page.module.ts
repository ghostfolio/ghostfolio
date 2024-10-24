import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';

import { ResourcesPageRoutingModule } from './resources-page-routing.module';
import { ResourcesPageComponent } from './resources-page.component';

@NgModule({
  declarations: [ResourcesPageComponent],
  imports: [
    CommonModule,
    ResourcesPageRoutingModule,
    MatTabsModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ResourcesPageModule {}
