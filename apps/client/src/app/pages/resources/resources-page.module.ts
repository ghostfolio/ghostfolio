import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

import { ResourcesPageRoutingModule } from './resources-page-routing.module';
import { ResourcesPageComponent } from './resources-page.component';

@NgModule({
  declarations: [ResourcesPageComponent],
  imports: [
    CommonModule,
    IonIcon,
    MatTabsModule,
    ResourcesPageRoutingModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ResourcesPageModule {}
