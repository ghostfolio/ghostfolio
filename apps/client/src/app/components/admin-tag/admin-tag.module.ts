import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';

import { AdminTagComponent } from './admin-tag.component';
import { GfCreateOrUpdateTagDialogModule } from './create-or-update-tag-dialog/create-or-update-tag-dialog.module';

@NgModule({
  declarations: [AdminTagComponent],
  exports: [AdminTagComponent],
  imports: [
    CommonModule,
    GfCreateOrUpdateTagDialogModule,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminTagModule {}
