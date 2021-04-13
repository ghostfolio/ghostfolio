import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ResourcesPageComponent } from './resources-page.component';

const routes: Routes = [{ path: '', component: ResourcesPageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ResourcesPageRoutingModule {}
