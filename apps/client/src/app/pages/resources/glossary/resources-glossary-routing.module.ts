import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ResourcesGlossaryPageComponent } from './resources-glossary.component';

const routes: Routes = [
  {
    component: ResourcesGlossaryPageComponent,
    path: '',
    title: $localize`Glossary`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesGlossaryRoutingModule {}
