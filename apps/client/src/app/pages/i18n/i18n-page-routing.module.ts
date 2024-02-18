import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { I18nPageComponent } from './i18n-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: I18nPageComponent,
    path: ''
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class I18nPageRoutingModule {}
