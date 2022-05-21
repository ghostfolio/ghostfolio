import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { GfValueModule } from '@ghostfolio/ui/value';

import { AdminUsersComponent } from './admin-users.component';

@NgModule({
  declarations: [AdminUsersComponent],
  exports: [],
  imports: [CommonModule, GfValueModule, MatButtonModule, MatMenuModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminUsersModule {}
