import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ResourcesGuidesRoutingModule } from './resources-guides-routing.module';
import { ResourcesGuidesComponent } from './resources-guides.component';

@NgModule({
  declarations: [ResourcesGuidesComponent],
  imports: [CommonModule, ResourcesGuidesRoutingModule]
})
export class ResourcesGuidesModule {}
