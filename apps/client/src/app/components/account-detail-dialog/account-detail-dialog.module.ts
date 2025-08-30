import { GfDialogFooterComponent } from '@ghostfolio/client/components/dialog-footer/dialog-footer.component';
import { GfDialogHeaderComponent } from '@ghostfolio/client/components/dialog-header/dialog-header.component';
import { GfInvestmentChartModule } from '@ghostfolio/client/components/investment-chart/investment-chart.module';
import { GfAccountBalancesComponent } from '@ghostfolio/ui/account-balances';
import { GfActivitiesTableComponent } from '@ghostfolio/ui/activities-table';
import { GfHoldingsTableComponent } from '@ghostfolio/ui/holdings-table';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { IonIcon } from '@ionic/angular/standalone';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';

import { AccountDetailDialog } from './account-detail-dialog.component';

@NgModule({
  declarations: [AccountDetailDialog],
  imports: [
    CommonModule,
    GfAccountBalancesComponent,
    GfActivitiesTableComponent,
    GfDialogFooterComponent,
    GfDialogHeaderComponent,
    GfHoldingsTableComponent,
    GfInvestmentChartModule,
    GfValueComponent,
    IonIcon,
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    NgxSkeletonLoaderModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class GfAccountDetailDialogModule {}
