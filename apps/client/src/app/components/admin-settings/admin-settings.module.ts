import { GfAdminPlatformModule } from '@ghostfolio/client/components/admin-platform/admin-platform.module';
import { GfAdminTagModule } from '@ghostfolio/client/components/admin-tag/admin-tag.module';
import { GfAssetProfileIconComponent } from '@ghostfolio/client/components/asset-profile-icon/asset-profile-icon.component';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';

import { AdminSettingsComponent } from './admin-settings.component';

@NgModule({
  declarations: [AdminSettingsComponent],
  imports: [
    CommonModule,
    GfAdminPlatformModule,
    GfAdminTagModule,
    GfAssetProfileIconComponent,
    GfPremiumIndicatorComponent,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminSettingsModule {}
