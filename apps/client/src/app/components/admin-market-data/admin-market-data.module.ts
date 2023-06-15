import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { GfActivitiesFilterModule } from '@ghostfolio/ui/activities-filter/activities-filter.module';

import { AdminMarketDataComponent } from './admin-market-data.component';
import { GfAssetProfileDialogModule } from './asset-profile-dialog/asset-profile-dialog.module';
import { GfCreateAssetProfileDialogModule } from './create-asset-profile-dialog/create-asset-profile-dialog.module';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [AdminMarketDataComponent],
  imports: [
    CommonModule,
    GfActivitiesFilterModule,
    GfAssetProfileDialogModule,
    GfCreateAssetProfileDialogModule,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminMarketDataModule {}
