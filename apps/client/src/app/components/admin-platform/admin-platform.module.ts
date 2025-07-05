import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

import { AdminPlatformComponent } from './admin-platform.component';
import { GfCreateOrUpdatePlatformDialogModule } from './create-or-update-platform-dialog/create-or-update-platform-dialog.module';

@NgModule({
  declarations: [AdminPlatformComponent],
  exports: [AdminPlatformComponent],
  imports: [
    CommonModule,
    GfCreateOrUpdatePlatformDialogModule,
    GfEntityLogoComponent,
    IonIcon,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminPlatformModule {}
