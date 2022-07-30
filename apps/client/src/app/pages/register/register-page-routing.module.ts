import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';

import { RegisterPageComponent } from './register-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: RegisterPageComponent,
    path: '',
    title: 'Registration'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RegisterPageRoutingModule {}
