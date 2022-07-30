import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { AboutPageComponent } from './about-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: AboutPageComponent,
    path: '',
    title: 'About'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AboutPageRoutingModule {}
