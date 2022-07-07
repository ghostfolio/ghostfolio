import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { AuthPageRoutingModule } from './auth-page-routing.module';
import { AuthPageComponent } from './auth-page.component';

@NgModule({
  declarations: [AuthPageComponent],
  imports: [AuthPageRoutingModule, CommonModule]
})
export class AuthPageModule {}
