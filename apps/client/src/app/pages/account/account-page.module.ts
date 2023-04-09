import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { RouterModule } from '@angular/router';
import { GfPortfolioAccessTableModule } from '@ghostfolio/client/components/access-table/access-table.module';
import { GfPremiumIndicatorModule } from '@ghostfolio/ui/premium-indicator';
import { GfValueModule } from '@ghostfolio/ui/value';

import { AccountPageRoutingModule } from './account-page-routing.module';
import { AccountPageComponent } from './account-page.component';
import { GfCreateOrUpdateAccessDialogModule } from './create-or-update-access-dialog/create-or-update-access-dialog.module';

@NgModule({
  declarations: [AccountPageComponent],
  imports: [
    AccountPageRoutingModule,
    CommonModule,
    FormsModule,
    GfCreateOrUpdateAccessDialogModule,
    GfPortfolioAccessTableModule,
    GfPremiumIndicatorModule,
    GfValueModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
    RouterModule
  ]
})
export class AccountPageModule {}
