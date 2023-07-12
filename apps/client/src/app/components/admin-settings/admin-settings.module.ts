import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GfAdminPlatformModule } from '@ghostfolio/client/components/admin-platform/admin-platform.module';

import { AdminSettingsComponent } from './admin-settings.component';

@NgModule({
  declarations: [AdminSettingsComponent],
  imports: [CommonModule, GfAdminPlatformModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminSettingsModule {}
