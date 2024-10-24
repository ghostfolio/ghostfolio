import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ResourcesMarketsComponent } from './resources-markets.component';

const routes: Routes = [
  {
    path: '',
    component: ResourcesMarketsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesMarketsRoutingModule {}
