import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { AdminMarketDataComponent } from './admin-market-data.component';
import { GfAssetProfileDialogModule } from './asset-profile-dialog/assset-profile-dialog.module';

@NgModule({
  declarations: [AdminMarketDataComponent],
  imports: [
    CommonModule,
    GfAssetProfileDialogModule,
    MatButtonModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAdminMarketDataModule {}
