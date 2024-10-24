import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ResourcesOverviewComponent } from './resources-overview.component';

const routes: Routes = [
  {
    path: '',
    component: ResourcesOverviewComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesOverviewRoutingModule {}
