import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AuthPageComponent } from './auth-page.component';

const routes: Routes = [
  { path: '', component: AuthPageComponent },
  { path: ':jwt', component: AuthPageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthPageRoutingModule {}
