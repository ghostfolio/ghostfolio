import { GfDialogFooterModule } from '@ghostfolio/client/components/dialog-footer/dialog-footer.module';
import { GfDialogHeaderModule } from '@ghostfolio/client/components/dialog-header/dialog-header.module';
import { GfInvestmentChartModule } from '@ghostfolio/client/components/investment-chart/investment-chart.module';
import { GfAccountBalancesModule } from '@ghostfolio/ui/account-balances/account-balances.module';
import { GfActivitiesTableModule } from '@ghostfolio/ui/activities-table/activities-table.module';
import { GfHoldingsTableModule } from '@ghostfolio/ui/holdings-table/holdings-table.module';
import { GfValueModule } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AccountDetailDialog } from './account-detail-dialog.component';

@NgModule({
  declarations: [AccountDetailDialog],
  imports: [
    CommonModule,
    GfAccountBalancesModule,
    GfActivitiesTableModule,
    GfDialogFooterModule,
    GfDialogHeaderModule,
    GfHoldingsTableModule,
    GfInvestmentChartModule,
    GfValueModule,
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAccountDetailDialogModule {}
