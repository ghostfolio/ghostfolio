import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ResourcesGuidesRoutingModule } from './resources-guides-routing.module';
import { ResourcesGuidesComponent } from './resources-guides.component';

@NgModule({
  declarations: [ResourcesGuidesComponent],
  imports: [CommonModule, ResourcesGuidesRoutingModule, RouterModule]
})
export class ResourcesGuidesModule {}
