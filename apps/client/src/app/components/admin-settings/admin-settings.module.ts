import { GfAdminPlatformModule } from '@ghostfolio/client/components/admin-platform/admin-platform.module';
import { GfAdminTagModule } from '@ghostfolio/client/components/admin-tag/admin-tag.module';
import { GfDataProviderStatusComponent } from '@ghostfolio/client/components/data-provider-status/data-provider-status.component';
import { GfEntityLogoComponent } from '@ghostfolio/ui/entity-logo';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
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
    GfDataProviderStatusComponent,
    GfEntityLogoComponent,
    GfPremiumIndicatorComponent,
    GfValueComponent,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminSettingsModule {}
