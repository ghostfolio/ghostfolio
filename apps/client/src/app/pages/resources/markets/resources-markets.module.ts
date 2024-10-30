import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ResourcesMarketsRoutingModule } from './resources-markets-routing.module';
import { ResourcesMarketsComponent } from './resources-markets.component';

@NgModule({
  declarations: [ResourcesMarketsComponent],
  imports: [CommonModule, ResourcesMarketsRoutingModule]
})
export class ResourcesMarketsModule {}
