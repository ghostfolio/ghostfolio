import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { FaqPageComponent } from './faq-page.component';

const routes: Routes = [
  { path: '', component: FaqPageComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FaqPageRoutingModule {}
