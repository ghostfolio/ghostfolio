import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatSortModule } from '@angular/material/sort';
import { GfActivitiesFilterModule } from '@ghostfolio/ui/activities-filter/activities-filter.module';

import { AdminMarketDataComponent } from './admin-market-data.component';
import { GfAssetProfileDialogModule } from './asset-profile-dialog/asset-profile-dialog.module';

@NgModule({
  declarations: [AdminMarketDataComponent],
  imports: [
    CommonModule,
    GfActivitiesFilterModule,
    GfAssetProfileDialogModule,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminMarketDataModule {}
