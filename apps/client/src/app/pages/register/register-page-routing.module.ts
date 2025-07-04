import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

import { RegisterPageComponent } from './register-page.component';

const routes: Routes = [
  {
    canActivate: [AuthGuard],
    component: RegisterPageComponent,
    path: '',
    title: publicRoutes.register.title
  }
];

@NgModule({
  imports: [IonIcon, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RegisterPageRoutingModule {}
