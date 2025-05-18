import { GfAdminPlatformModule } from '@ghostfolio/client/components/admin-platform/admin-platform.module';
import { GfAdminTagModule } from '@ghostfolio/client/components/admin-tag/admin-tag.module';
import { GfAssetProfileIconComponent } from '@ghostfolio/client/components/asset-profile-icon/asset-profile-icon.component';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

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
    MatMenuModule,
    MatProgressBarModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminSettingsModule {}
