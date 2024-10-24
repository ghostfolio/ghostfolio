import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ResourcesGuidesComponent } from './resources-guides.component';

const routes: Routes = [
  {
    path: '',
    component: ResourcesGuidesComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesGuidesRoutingModule {}
