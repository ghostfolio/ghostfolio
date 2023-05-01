import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { AdminPlatformComponent } from './platform.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { GfCreateOrUpdatePlatformDialogModule } from './create-or-update-platform-dialog/create-or-update-platform-dialog.module';
import { MatMenuModule } from '@angular/material/menu';
import { GfSymbolIconModule } from '../symbol-icon/symbol-icon.module';

@NgModule({
  declarations: [AdminPlatformComponent],
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    GfSymbolIconModule,
    MatSortModule,
    MatTableModule,
    MatMenuModule,
    GfCreateOrUpdatePlatformDialogModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminPlatformModule {}
