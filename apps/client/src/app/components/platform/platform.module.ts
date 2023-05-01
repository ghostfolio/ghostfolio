import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { AdminPlatformComponent } from './platform.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

@NgModule({
  declarations: [AdminPlatformComponent],
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatSortModule,
    MatTableModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminPlatformModule {}
