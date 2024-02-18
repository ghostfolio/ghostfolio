import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SaasPageComponent } from './saas-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: SaasPageComponent,
    path: '',
    title: $localize`Cloud` + ' (SaaS) – ' + $localize`FAQ`
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SaasPageRoutingModule {}
