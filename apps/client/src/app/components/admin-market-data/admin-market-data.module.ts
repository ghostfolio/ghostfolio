import { GfSymbolModule } from '@ghostfolio/client/pipes/symbol/symbol.module';
import { GfActivitiesFilterModule } from '@ghostfolio/ui/activities-filter/activities-filter.module';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AdminMarketDataComponent } from './admin-market-data.component';
import { AdminMarketDataService } from './admin-market-data.service';
import { GfAssetProfileDialogModule } from './asset-profile-dialog/asset-profile-dialog.module';
import { GfCreateAssetProfileDialogModule } from './create-asset-profile-dialog/create-asset-profile-dialog.module';

@NgModule({
  declarations: [AdminMarketDataComponent],
  imports: [
    CommonModule,
    GfActivitiesFilterModule,
    GfAssetProfileDialogModule,
    GfCreateAssetProfileDialogModule,
    GfSymbolModule,
    MatButtonModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule,
    NgxSkeletonLoaderModule,
    RouterModule
  ],
  providers: [AdminMarketDataService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminMarketDataModule {}
