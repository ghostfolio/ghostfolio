import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';

import { AdminUsersComponent } from './admin-users.component';

@NgModule({
  declarations: [AdminUsersComponent],
  exports: [],
  imports: [
    CommonModule,
    GfPremiumIndicatorComponent,
    GfValueComponent,
    MatButtonModule,
    MatMenuModule,
    MatTableModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminUsersModule {}
