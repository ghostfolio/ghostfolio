import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ResourcesGuidesComponent } from './resources-guides.component';

const routes: Routes = [
  {
    component: ResourcesGuidesComponent,
    path: '',
    title: publicRoutes.resources.subRoutes.guides.title
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesGuidesRoutingModule {}
