import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ResourcesGlossaryRoutingModule } from './resources-glossary-routing.module';
import { ResourcesGlossaryPageComponent } from './resources-glossary.component';

@NgModule({
  declarations: [ResourcesGlossaryPageComponent],
  imports: [CommonModule, ResourcesGlossaryRoutingModule, RouterModule]
})
export class ResourcesGlossaryPageModule {}
