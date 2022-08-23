import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { FaqPageComponent } from './faq-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: FaqPageComponent,
    path: '',
    title: $localize`FAQ`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FaqPageRoutingModule {}
