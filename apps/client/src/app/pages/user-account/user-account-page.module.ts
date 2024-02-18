import { GfUserAccountAccessModule } from '@ghostfolio/client/components/user-account-access/user-account-access.module';
import { GfUserAccountMembershipModule } from '@ghostfolio/client/components/user-account-membership/user-account-membership.module';
import { GfUserAccountSettingsModule } from '@ghostfolio/client/components/user-account-settings/user-account-settings.module';

import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

import { UserAccountPageRoutingModule } from './user-account-page-routing.module';
import { UserAccountPageComponent } from './user-account-page.component';

@NgModule({
  declarations: [UserAccountPageComponent],
  imports: [
    CommonModule,
    GfUserAccountAccessModule,
    GfUserAccountMembershipModule,
    GfUserAccountSettingsModule,
    MatTabsModule,
    UserAccountPageRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UserAccountPageModule {}
