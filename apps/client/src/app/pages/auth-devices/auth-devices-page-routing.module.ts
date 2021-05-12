import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@ghostfolio/client/core/auth.guard';
import { AuthDevicesPageComponent } from '@ghostfolio/client/pages/auth-devices/auth-devices-page.component';

const routes: Routes = [
  { path: '', component: AuthDevicesPageComponent, canActivate: [AuthGuard] }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthDevicesPageRoutingModule {}
