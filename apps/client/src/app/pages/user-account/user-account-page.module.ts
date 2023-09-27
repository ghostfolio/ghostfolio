import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { UserAccountPageRoutingModule } from './user-account-page-routing.module';
import { UserAccountPageComponent } from './user-account-page.component';
import { GfUserAccountSettingsModule } from '@ghostfolio/client/components/user-account-settings/user-account-settings.module';
import { GfUserAccountAccessModule } from '@ghostfolio/client/components/user-account-access/user-account-access.module';
import { GfUserAccountMembershipModule } from '@ghostfolio/client/components/user-account-membership/user-account-membership.module';

@NgModule({
  declarations: [UserAccountPageComponent],
  imports: [
    CommonModule,
    GfUserAccountAccessModule,
    GfUserAccountMembershipModule,
    GfUserAccountSettingsModule,
    UserAccountPageRoutingModule
  ]
})
export class UserAccountPageModule {}
