import { GfAdminPlatformModule } from '@ghostfolio/client/components/admin-platform/admin-platform.module';
import { GfAdminTagModule } from '@ghostfolio/client/components/admin-tag/admin-tag.module';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AdminSettingsComponent } from './admin-settings.component';

@NgModule({
  declarations: [AdminSettingsComponent],
  imports: [
    CommonModule,
    GfAdminPlatformModule,
    GfAdminTagModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminSettingsModule {}
