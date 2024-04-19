import { GfMembershipCardComponent } from '@ghostfolio/ui/membership-card';
import { GfPremiumIndicatorComponent } from '@ghostfolio/ui/premium-indicator';
import { GfValueComponent } from '@ghostfolio/ui/value';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { RouterModule } from '@angular/router';

import { UserAccountMembershipComponent } from './user-account-membership.component';

@NgModule({
  declarations: [UserAccountMembershipComponent],
  exports: [UserAccountMembershipComponent],
  imports: [
    CommonModule,
    GfMembershipCardComponent,
    GfPremiumIndicatorComponent,
    GfValueComponent,
    MatButtonModule,
    MatCardModule,
    RouterModule
  ]
})
export class GfUserAccountMembershipModule {}
