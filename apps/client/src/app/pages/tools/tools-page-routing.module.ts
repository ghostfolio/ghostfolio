import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ToolsPageComponent } from './tools-page.component';

const routes: Routes = [{ path: '', component: ToolsPageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ToolsPageRoutingModule {}
