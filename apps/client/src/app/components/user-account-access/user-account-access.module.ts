import { GfPortfolioAccessTableModule } from '@ghostfolio/client/components/access-table/access-table.module';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';

import { GfCreateOrUpdateAccessDialogModule } from './create-or-update-access-dialog/create-or-update-access-dialog.module';
import { UserAccountAccessComponent } from './user-account-access.component';

@NgModule({
  declarations: [UserAccountAccessComponent],
  exports: [UserAccountAccessComponent],
  imports: [
    CommonModule,
    GfCreateOrUpdateAccessDialogModule,
    GfPortfolioAccessTableModule,
    GfPremiumIndicatorModule,
    MatButtonModule,
    MatDialogModule,
    RouterModule
  ]
})
export class GfUserAccountAccessModule {}
