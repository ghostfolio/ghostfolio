import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SelfHostingPageComponent } from './self-hosting-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: SelfHostingPageComponent,
    path: '',
    title: $localize`Self-Hosting` + ' – ' + $localize`FAQ`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SelfHostingPageRoutingModule {}
