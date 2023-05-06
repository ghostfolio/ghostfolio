import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { GfAdminJobsModule } from '@ghostfolio/client/components/admin-jobs/admin-jobs.module';
import { GfAdminMarketDataModule } from '@ghostfolio/client/components/admin-market-data/admin-market-data.module';
import { GfAdminOverviewModule } from '@ghostfolio/client/components/admin-overview/admin-overview.module';
import { GfAdminPlatformModule } from '@ghostfolio/client/components/admin-platform/admin-platform.module';
import { GfAdminUsersModule } from '@ghostfolio/client/components/admin-users/admin-users.module';
import { CacheService } from '@ghostfolio/client/services/cache.service';

import { AdminPageRoutingModule } from './admin-page-routing.module';
import { AdminPageComponent } from './admin-page.component';

@NgModule({
  declarations: [AdminPageComponent],
  exports: [],
  imports: [
    AdminPageRoutingModule,
    CommonModule,
    GfAdminJobsModule,
    GfAdminMarketDataModule,
    GfAdminOverviewModule,
    GfAdminPlatformModule,
    GfAdminUsersModule,
    MatTabsModule
  ],
  providers: [CacheService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminPageModule {}
