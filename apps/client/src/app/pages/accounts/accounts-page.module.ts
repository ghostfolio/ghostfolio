import { GfAccountDetailDialogModule } from '@ghostfolio/client/components/account-detail-dialog/account-detail-dialog.module';
import { GfAccountsTableModule } from '@ghostfolio/client/components/accounts-table/accounts-table.module';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import { AccountsPageRoutingModule } from './accounts-page-routing.module';
import { AccountsPageComponent } from './accounts-page.component';
import { GfCreateOrUpdateAccountDialogModule } from './create-or-update-account-dialog/create-or-update-account-dialog.module';
import { GfTransferBalanceDialogModule } from './transfer-balance/transfer-balance-dialog.module';

@NgModule({
  declarations: [AccountsPageComponent],
  imports: [
    AccountsPageRoutingModule,
    CommonModule,
    GfAccountDetailDialogModule,
    GfAccountsTableModule,
    GfCreateOrUpdateAccountDialogModule,
    GfTransferBalanceDialogModule,
    MatButtonModule,
    RouterModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AccountsPageModule {}
