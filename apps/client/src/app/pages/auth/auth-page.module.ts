import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AuthPageRoutingModule } from './auth-page-routing.module';
import { AuthPageComponent } from './auth-page.component';

@NgModule({
  declarations: [AuthPageComponent],
  exports: [],
  imports: [AuthPageRoutingModule, CommonModule],
  providers: []
})
export class AuthPageModule {}
