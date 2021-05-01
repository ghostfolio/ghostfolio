import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { GfAccountsTableModule } from '@ghostfolio/client/components/accounts-table/accounts-table.module';

import { AccountsPageRoutingModule } from './accounts-page-routing.module';
import { AccountsPageComponent } from './accounts-page.component';
import { CreateOrUpdateAccountDialogModule } from './create-or-update-account-dialog/create-or-update-account-dialog.module';

@NgModule({
  declarations: [AccountsPageComponent],
  exports: [],
  imports: [
    AccountsPageRoutingModule,
    CommonModule,
    CreateOrUpdateAccountDialogModule,
    GfAccountsTableModule,
    MatButtonModule,
    RouterModule
  ],
  providers: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AccountsPageModule {}
