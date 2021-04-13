import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AboutPageComponent } from './about-page.component';

const routes: Routes = [{ path: '', component: AboutPageComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AboutPageRoutingModule {}
