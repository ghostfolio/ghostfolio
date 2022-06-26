import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { GfDialogFooterModule } from '@ghostfolio/client/components/dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '@ghostfolio/client/components/dialog-header/dialog-header.module';
import { GfActivitiesTableModule } from '@ghostfolio/ui/activities-table/activities-table.module';
import { GfValueModule } from '@ghostfolio/ui/value';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AccountDetailDialog } from './account-detail-dialog.component';

@NgModule({
  declarations: [AccountDetailDialog],
  exports: [],
  imports: [
    CommonModule,
    GfActivitiesTableModule,
    GfDialogFooterModule,
    GfDialogHeaderModule,
    GfValueModule,
    MatButtonModule,
    MatDialogModule,
    NgxSkeletonLoaderModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAccountDetailDialogModule {}
