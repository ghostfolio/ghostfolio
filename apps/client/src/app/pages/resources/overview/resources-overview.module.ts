import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ResourcesOverviewRoutingModule } from './resources-overview-routing.module';
import { ResourcesOverviewComponent } from './resources-overview.component';

@NgModule({
  declarations: [ResourcesOverviewComponent],
  imports: [CommonModule, RouterModule, ResourcesOverviewRoutingModule]
})
export class ResourcesOverviewModule {}
