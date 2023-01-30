import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { GfAdminJobsModule } from '@ghostfolio/client/components/admin-jobs/admin-jobs.module';
import { GfAdminMarketDataModule } from '@ghostfolio/client/components/admin-market-data/admin-market-data.module';
import { GfAdminOverviewModule } from '@ghostfolio/client/components/admin-overview/admin-overview.module';
import { GfAdminUsersModule } from '@ghostfolio/client/components/admin-users/admin-users.module';
import { CacheService } from '@ghostfolio/client/services/cache.service';
import { GfValueModule } from '@ghostfolio/ui/value';

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
    GfAdminUsersModule,
    GfValueModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatTabsModule
  ],
  providers: [CacheService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AdminPageModule {}
